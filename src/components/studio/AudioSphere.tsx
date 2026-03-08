'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import Canvas3D from '@/components/shared/Canvas3D';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import { laplacianSmoothY } from '@/lib/chromesthesia';

const SIZE = 8;
const SEGMENTS = 80;
const VERTEX_COUNT = (SEGMENTS + 1) * (SEGMENTS + 1);

/**
 * Multi-octave sine noise — smooth rolling terrain.
 * Time is baked into the seed so the landscape flows continuously.
 */
function noise2D(x: number, y: number, seed: number): number {
  const n1 = Math.sin(x * 0.7 + y * 0.5 + seed * 0.13) *
             Math.cos(y * 0.6 - x * 0.4 + seed * 0.07);
  const n2 = Math.sin(x * 1.4 + y * 1.0 + seed * 0.31) *
             Math.cos(y * 1.2 - x * 0.8 + seed * 0.19) * 0.5;
  const n3 = Math.sin(x * 2.5 + y * 1.8 + seed * 0.53) *
             Math.cos(y * 2.1 - x * 1.5 + seed * 0.41) * 0.25;
  const n4 = Math.sin(x * 0.3 + y * 0.2 + seed * 0.71) *
             Math.cos(y * 0.35 - x * 0.25 + seed * 0.59) * 0.8;
  return (n1 + n2 + n3 + n4) / 2.55;
}

// Deep blue valleys → icy blue-white peaks
function surfaceGradient(t: number): [number, number, number] {
  const s = t * t * (3 - 2 * t); // smoothstep
  const r = 0.02 + s * 0.40;
  const g = 0.04 + s * 0.55;
  const b = 0.22 + s * 0.73;
  return [r, g, b];
}

export function ChromesthesiaSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);

  const analyser = useAudioAnalyser();

  // Smoothed amplitude — very slow response for breathing feel
  const smoothedAmp = useRef(0);

  // Heights for smooth interpolation
  const currentHeights = useRef(new Float32Array(VERTEX_COUNT));

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const colors = new Float32Array(VERTEX_COUNT * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geo;
  }, []);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    const isPlaying = useAudioStore.getState().isPlaying;
    // Always advance time — slow, continuous
    timeRef.current += delta;

    if (isPlaying) {
      analyser.update();
    }
    const t = timeRef.current;

    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    // Compute audio energy — very slow smoothing for breathing feel
    let energy = 0;
    if (hasAudio) {
      let sum = 0;
      for (let i = 0; i < normFreq.length; i++) sum += normFreq[i] * normFreq[i];
      energy = Math.sqrt(sum / normFreq.length);
    }
    // Very slow EMA — no sudden jumps, just gradual breathing
    smoothedAmp.current += (energy - smoothedAmp.current) * 0.03;
    const amp = smoothedAmp.current;

    // Height scale: gentle idle, grows with sustained audio energy
    const idleScale = 1.5;
    const audioScale = 2.0 + amp * 18.0;
    const scale = hasAudio ? audioScale : idleScale;

    // Generate target heights — time drives continuous slow evolution
    // No beat-based seed jumping. Just smooth time flow.
    const seed = t * 0.04; // very slow drift

    const positions = geometry.attributes.position;
    const posArr = positions.array as Float32Array;
    const current = currentHeights.current;

    for (let iy = 0; iy <= SEGMENTS; iy++) {
      for (let ix = 0; ix <= SEGMENTS; ix++) {
        const idx = iy * (SEGMENTS + 1) + ix;
        const nx = ix / SEGMENTS;
        const ny = iy / SEGMENTS;

        const n = noise2D(nx * 4, ny * 4, seed);
        const target = n * scale;

        // Very slow interpolation — smooth breathing motion
        const alpha = 0.04;
        current[idx] += (target - current[idx]) * alpha;

        posArr[idx * 3 + 1] = current[idx];
      }
    }

    // Laplacian smoothing
    laplacianSmoothY(posArr, SEGMENTS + 1, SEGMENTS + 1, 2);

    // Color based on height
    const colors = geometry.attributes.color;
    const colArr = colors.array as Float32Array;

    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < VERTEX_COUNT; i++) {
      const h = posArr[i * 3 + 1];
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
    const range = Math.max(0.01, maxH - minH);

    for (let i = 0; i < VERTEX_COUNT; i++) {
      const h = posArr[i * 3 + 1];
      const normalized = (h - minH) / range;
      const [r, g, b] = surfaceGradient(normalized);
      colArr[i * 3] = r;
      colArr[i * 3 + 1] = g;
      colArr[i * 3 + 2] = b;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geometry.computeVertexNormals();

    // Slow auto-rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.3}
          metalness={0.25}
          toneMapped={false}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  );
}

export default function AudioSphere() {
  return (
    <Canvas3D
      camera={{ position: [0, 5, 8], fov: 50 }}
      className="w-full h-full"
    >
      <ChromesthesiaSurface />
    </Canvas3D>
  );
}
