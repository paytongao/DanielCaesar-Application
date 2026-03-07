'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import Canvas3D from '@/components/shared/Canvas3D';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import {
  gaussianSmooth1D,
  laplacianSmoothY,
  detectBeat,
} from '@/lib/chromesthesia';

const SIZE = 8;
const SEGMENTS = 80;
const VERTEX_COUNT = (SEGMENTS + 1) * (SEGMENTS + 1);

/**
 * Simple hash-based pseudo-noise for deterministic random peaks.
 * Multi-octave sine composition that looks organic.
 */
function noise2D(x: number, y: number, seed: number): number {
  // 4 octaves of sine-based noise with irrational frequencies
  const n1 = Math.sin(x * 1.3 + y * 0.7 + seed * 0.13) *
             Math.cos(y * 1.1 - x * 0.9 + seed * 0.07);
  const n2 = Math.sin(x * 2.7 + y * 1.9 + seed * 0.31) *
             Math.cos(y * 2.3 - x * 1.7 + seed * 0.19) * 0.5;
  const n3 = Math.sin(x * 5.1 + y * 3.7 + seed * 0.53) *
             Math.cos(y * 4.3 - x * 3.1 + seed * 0.41) * 0.25;
  const n4 = Math.sin(x * 0.5 + y * 0.3 + seed * 0.71) *
             Math.cos(y * 0.7 - x * 0.4 + seed * 0.59) * 1.5;
  return (n1 + n2 + n3 + n4) / 2.25;
}

// Monochrome gradient: black → grey → white based on normalized height
function monochromeGradient(t: number): [number, number, number] {
  // Smooth cubic interpolation for a rich gradient feel
  const s = t * t * (3 - 2 * t); // smoothstep
  // Deep charcoal at bottom, cool silver-white at peaks
  const r = 0.03 + s * 0.87;
  const g = 0.03 + s * 0.87;
  const b = 0.05 + s * 0.90; // slight cool tint
  return [r, g, b];
}

export function ChromesthesiaSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);

  const analyser = useAudioAnalyser();

  // Noise seed that shifts on beats for new peak patterns
  const noiseSeed = useRef(0);
  const seedTarget = useRef(0);
  const beatHistory = useRef<number[]>([]);

  // Smoothed amplitude
  const smoothedAmp = useRef(0);

  // Target heights for smooth interpolation
  const targetHeights = useRef(new Float32Array(VERTEX_COUNT));
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
    if (isPlaying) {
      timeRef.current += delta;
      analyser.update();
    }
    const t = timeRef.current;

    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    // Compute overall audio energy (RMS)
    let energy = 0;
    if (hasAudio) {
      let sum = 0;
      for (let i = 0; i < normFreq.length; i++) sum += normFreq[i] * normFreq[i];
      energy = Math.sqrt(sum / normFreq.length);
    }
    // Smooth amplitude
    smoothedAmp.current += (energy - smoothedAmp.current) * 0.12;
    const amp = smoothedAmp.current;

    // Beat detection: shift noise seed for new peak patterns
    if (hasAudio) {
      const isBeat = detectBeat(normFreq, beatHistory.current, 1.3);
      if (isBeat) {
        seedTarget.current += 2.0 + Math.random() * 3.0;
      }
    }
    // Smoothly interpolate seed
    noiseSeed.current += (seedTarget.current - noiseSeed.current) * 0.04;

    const scale = 8.0;

    // Generate target height field from noise
    const targets = targetHeights.current;
    if (hasAudio) {
      for (let iy = 0; iy <= SEGMENTS; iy++) {
        for (let ix = 0; ix <= SEGMENTS; ix++) {
          const idx = iy * (SEGMENTS + 1) + ix;
          const nx = ix / SEGMENTS;
          const ny = iy / SEGMENTS;

          // Multi-octave noise driven by time and seed
          const n = noise2D(nx * 4, ny * 4, noiseSeed.current + t * 0.15);
          // Only raise peaks (clamp negatives to near-zero for clean valleys)
          const peak = Math.max(0, n);
          // Audio amplitude scales the height
          targets[idx] = peak * amp * scale * 3.0;
        }
      }

      // Gaussian smooth the target heights as a 1D array per row
      // Then transpose and smooth columns for 2D smoothing
      for (let iy = 0; iy <= SEGMENTS; iy++) {
        const row = new Array(SEGMENTS + 1);
        for (let ix = 0; ix <= SEGMENTS; ix++) {
          row[ix] = targets[iy * (SEGMENTS + 1) + ix];
        }
        const smoothed = gaussianSmooth1D(row, 3);
        for (let ix = 0; ix <= SEGMENTS; ix++) {
          targets[iy * (SEGMENTS + 1) + ix] = smoothed[ix];
        }
      }
      for (let ix = 0; ix <= SEGMENTS; ix++) {
        const col = new Array(SEGMENTS + 1);
        for (let iy = 0; iy <= SEGMENTS; iy++) {
          col[iy] = targets[iy * (SEGMENTS + 1) + ix];
        }
        const smoothed = gaussianSmooth1D(col, 3);
        for (let iy = 0; iy <= SEGMENTS; iy++) {
          targets[iy * (SEGMENTS + 1) + ix] = smoothed[iy];
        }
      }
    } else {
      // Flat when no audio
      targets.fill(0);
    }

    // Smooth temporal interpolation toward target heights
    const current = currentHeights.current;
    const alpha = 0.15;
    for (let i = 0; i < VERTEX_COUNT; i++) {
      current[i] += (targets[i] - current[i]) * alpha;
    }

    // Write heights to geometry
    const positions = geometry.attributes.position;
    const posArr = positions.array as Float32Array;
    for (let i = 0; i < VERTEX_COUNT; i++) {
      posArr[i * 3 + 1] = current[i];
    }

    // Laplacian smoothing for silk-smooth surface
    laplacianSmoothY(posArr, SEGMENTS + 1, SEGMENTS + 1, 3);

    // Monochrome gradient coloring based on height
    const colors = geometry.attributes.color;
    const colArr = colors.array as Float32Array;

    // Find max height for normalization
    let maxH = 0.01;
    for (let i = 0; i < VERTEX_COUNT; i++) {
      const h = posArr[i * 3 + 1];
      if (h > maxH) maxH = h;
    }

    for (let i = 0; i < VERTEX_COUNT; i++) {
      const h = posArr[i * 3 + 1];
      const t = Math.max(0, Math.min(1, h / maxH));
      const [r, g, b] = monochromeGradient(t);
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
          roughness={0.4}
          metalness={0.15}
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
