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
 * Multi-octave sine noise. Centered coordinates so no side bias.
 */
function noise2D(x: number, y: number, seed: number): number {
  // Center the coordinates around 0 to avoid spatial bias
  const cx = x - 2.0;
  const cy = y - 2.0;
  const n1 = Math.sin(cx * 0.7 + cy * 0.5 + seed * 0.13) *
             Math.cos(cy * 0.6 - cx * 0.4 + seed * 0.07);
  const n2 = Math.sin(cx * 1.4 + cy * 1.0 + seed * 0.31) *
             Math.cos(cy * 1.2 - cx * 0.8 + seed * 0.19) * 0.5;
  const n3 = Math.sin(cx * 2.5 + cy * 1.8 + seed * 0.53) *
             Math.cos(cy * 2.1 - cx * 1.5 + seed * 0.41) * 0.25;
  const n4 = Math.sin(cx * 0.3 + cy * 0.2 + seed * 0.71) *
             Math.cos(cy * 0.35 - cx * 0.25 + seed * 0.59) * 0.8;
  return (n1 + n2 + n3 + n4) / 2.55;
}

/**
 * Drastic multi-shade blue gradient with neon blues, dark navy, and white.
 * Uses emissive-friendly colors (unlit material shows these directly).
 */
function surfaceGradient(t: number): [number, number, number] {
  if (t < 0.15) {
    // Very deep navy / near-black blue
    const s = t / 0.15;
    return [0.005 + s * 0.01, 0.005 + s * 0.015, 0.04 + s * 0.08];
  } else if (t < 0.35) {
    // Dark navy → rich dark blue
    const s = (t - 0.15) / 0.2;
    return [0.015 + s * 0.01, 0.02 + s * 0.03, 0.12 + s * 0.20];
  } else if (t < 0.55) {
    // Rich blue → neon electric blue
    const s = (t - 0.35) / 0.2;
    return [0.025 + s * 0.05, 0.05 + s * 0.20, 0.32 + s * 0.45];
  } else if (t < 0.75) {
    // Neon blue → bright cyan-blue
    const s = (t - 0.55) / 0.2;
    return [0.075 + s * 0.25, 0.25 + s * 0.40, 0.77 + s * 0.18];
  } else if (t < 0.9) {
    // Bright cyan-blue → light icy blue
    const s = (t - 0.75) / 0.15;
    return [0.325 + s * 0.35, 0.65 + s * 0.20, 0.95 - s * 0.05];
  } else {
    // Icy blue → white
    const s = (t - 0.9) / 0.1;
    return [0.675 + s * 0.32, 0.85 + s * 0.15, 0.90 + s * 0.10];
  }
}

export function ChromesthesiaSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);

  const analyser = useAudioAnalyser();

  const smoothedAmp = useRef(0);
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
    // Faster smoothing so it actually responds to the music
    smoothedAmp.current += (energy - smoothedAmp.current) * 0.08;
    const amp = smoothedAmp.current;

    // Height scale — more responsive to audio
    const idleScale = 1.5;
    const audioScale = 3.0 + amp * 30.0;
    const scale = hasAudio ? audioScale : idleScale;

    const seed = t * 0.04;

    const positions = geometry.attributes.position;
    const posArr = positions.array as Float32Array;
    const current = currentHeights.current;

    // Generate noise field and compute mean for centering
    const rawNoise = new Float32Array(VERTEX_COUNT);
    let noiseMean = 0;
    for (let iy = 0; iy <= SEGMENTS; iy++) {
      for (let ix = 0; ix <= SEGMENTS; ix++) {
        const idx = iy * (SEGMENTS + 1) + ix;
        const nx = ix / SEGMENTS;
        const ny = iy / SEGMENTS;
        rawNoise[idx] = noise2D(nx * 4, ny * 4, seed);
        noiseMean += rawNoise[idx];
      }
    }
    noiseMean /= VERTEX_COUNT;

    // Apply centered noise with scale
    for (let i = 0; i < VERTEX_COUNT; i++) {
      const target = (rawNoise[i] - noiseMean) * scale;

      // Smooth interpolation — responsive but not jerky
      const alpha = hasAudio ? 0.07 : 0.04;
      current[i] += (target - current[i]) * alpha;
      posArr[i * 3 + 1] = current[i];
    }

    // Laplacian smoothing
    laplacianSmoothY(posArr, SEGMENTS + 1, SEGMENTS + 1, 2);

    // Color based on height — full gradient range
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

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshBasicMaterial
          vertexColors
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
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
