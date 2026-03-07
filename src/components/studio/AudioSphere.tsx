'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import Canvas3D from '@/components/shared/Canvas3D';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import {
  laplacianSmoothY,
  detectBeat,
} from '@/lib/chromesthesia';

const SIZE = 8;
const SEGMENTS = 80;
const VERTEX_COUNT = (SEGMENTS + 1) * (SEGMENTS + 1);

/**
 * Multi-octave sine noise — produces smooth rolling terrain.
 * Returns values in roughly [-1, 1] range.
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

// Blue-white gradient: dark blue valleys → bright blue-white peaks
function surfaceGradient(t: number): [number, number, number] {
  // t in [0, 1] where 0 = lowest valley, 1 = highest peak
  const s = t * t * (3 - 2 * t); // smoothstep
  const r = 0.06 + s * 0.82;
  const g = 0.08 + s * 0.85;
  const b = 0.16 + s * 0.80;
  return [r, g, b];
}

export function ChromesthesiaSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);

  const analyser = useAudioAnalyser();

  // Noise seed that shifts on beats
  const noiseSeed = useRef(0);
  const seedTarget = useRef(0);
  const beatHistory = useRef<number[]>([]);

  // Smoothed amplitude
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
    // Always advance time for idle animation
    timeRef.current += delta;

    if (isPlaying) {
      analyser.update();
    }
    const t = timeRef.current;

    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    // Compute audio energy
    let energy = 0;
    if (hasAudio) {
      let sum = 0;
      for (let i = 0; i < normFreq.length; i++) sum += normFreq[i] * normFreq[i];
      energy = Math.sqrt(sum / normFreq.length);
    }
    smoothedAmp.current += (energy - smoothedAmp.current) * 0.12;

    // Beat detection: shift noise seed
    if (hasAudio) {
      const isBeat = detectBeat(normFreq, beatHistory.current, 1.3);
      if (isBeat) {
        seedTarget.current += 1.5 + Math.random() * 2.0;
      }
    }
    noiseSeed.current += (seedTarget.current - noiseSeed.current) * 0.03;

    // Height scale: idle has gentle waves, audio amplifies dramatically
    const idleScale = 1.2;
    const audioScale = 4.0 + smoothedAmp.current * 20.0;
    const scale = hasAudio ? audioScale : idleScale;

    // Generate target heights from noise
    const positions = geometry.attributes.position;
    const posArr = positions.array as Float32Array;
    const current = currentHeights.current;

    for (let iy = 0; iy <= SEGMENTS; iy++) {
      for (let ix = 0; ix <= SEGMENTS; ix++) {
        const idx = iy * (SEGMENTS + 1) + ix;
        const nx = ix / SEGMENTS;
        const ny = iy / SEGMENTS;

        // Noise with both peaks AND valleys (full range, not clamped)
        const n = noise2D(nx * 4, ny * 4, noiseSeed.current + t * 0.08);

        // Target height
        const target = n * scale;

        // Smooth temporal interpolation — gentle rise/fall
        const alpha = hasAudio ? 0.12 : 0.06;
        current[idx] += (target - current[idx]) * alpha;

        posArr[idx * 3 + 1] = current[idx];
      }
    }

    // Laplacian smoothing — just 2 passes for smooth but not flat
    laplacianSmoothY(posArr, SEGMENTS + 1, SEGMENTS + 1, 2);

    // Color based on height
    const colors = geometry.attributes.color;
    const colArr = colors.array as Float32Array;

    // Find min/max for normalization
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
      const normalized = (h - minH) / range; // 0 to 1
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
      groupRef.current.rotation.y += delta * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.35}
          metalness={0.2}
          toneMapped={false}
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
