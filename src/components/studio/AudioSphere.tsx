'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import Canvas3D from '@/components/shared/Canvas3D';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import {
  smoothChromesthesiaColor,
  aggregateFrequencyBands,
  gaussianSmooth1D,
  laplacianSmoothY,
} from '@/lib/chromesthesia';

const SIZE = 8;
const SEGMENTS = 80;
const VERTEX_COUNT = (SEGMENTS + 1) * (SEGMENTS + 1);

function ChromesthesiaSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);

  const analyser = useAudioAnalyser();

  // Smoothed frequency bands for temporal interpolation
  const smoothedBands = useRef(new Float32Array(SEGMENTS + 1));

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

    // Get frequency bands matching grid columns
    let bands: number[];
    if (hasAudio) {
      const raw = aggregateFrequencyBands(normFreq, SEGMENTS + 1);
      bands = gaussianSmooth1D(raw, 4);
    } else {
      // Procedural Mathematica-style surface
      bands = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const x = i / SEGMENTS;
        const bass = Math.exp(-x * 8) * 0.5;
        const mid = Math.exp(-Math.pow(x - 0.3, 2) * 30) * 0.4;
        const presence = Math.exp(-Math.pow(x - 0.55, 2) * 50) * 0.3;
        const air = Math.exp(-Math.pow(x - 0.8, 2) * 70) * 0.15;
        const mod1 = Math.sin(t * 1.5 + x * 12) * 0.06;
        const mod2 = Math.sin(t * 2.2 + x * 8) * 0.04;
        const breathe = Math.sin(t * 0.4) * 0.04 + 0.05;
        bands.push(Math.max(0.02, bass + mid + presence + air + mod1 + mod2 + breathe));
      }
    }

    // Temporal smoothing — exponential moving average
    const prev = smoothedBands.current;
    const alpha = 0.2;
    for (let i = 0; i <= SEGMENTS; i++) {
      prev[i] += (bands[i] - prev[i]) * alpha;
    }

    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;
    const posArr = positions.array as Float32Array;
    const colArr = colors.array as Float32Array;

    const scale = 4.0;

    // Displace Y by frequency amplitude, cross-faded along Z
    for (let i = 0; i < positions.count; i++) {
      const ix = i % (SEGMENTS + 1);
      const iy = Math.floor(i / (SEGMENTS + 1));

      const bandValue = prev[ix];
      const crossBand = prev[iy];

      // Cross-fade between X-freq and Y-freq for 3D depth
      const height = (bandValue * 0.7 + crossBand * 0.3) * scale;

      // Add subtle wave for organic feel
      const nx = ix / SEGMENTS;
      const ny = iy / SEGMENTS;
      const wave = Math.sin(t * 0.8 + nx * 6 + ny * 4) * 0.08 * scale;

      posArr[i * 3 + 1] = height + wave;
    }

    // Laplacian mesh smoothing for silky surface
    laplacianSmoothY(posArr, SEGMENTS + 1, SEGMENTS + 1, 3);

    // Color based on actual pitch content at each vertex
    for (let i = 0; i < positions.count; i++) {
      const ix = i % (SEGMENTS + 1);
      const freqNorm = ix / SEGMENTS;
      // Read back the smoothed height for amplitude
      const amp = Math.min(1, Math.max(0, posArr[i * 3 + 1] / scale));

      const [r, g, b] = smoothChromesthesiaColor(freqNorm, amp);
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
          roughness={0.5}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function AudioSphere() {
  return (
    <Canvas3D
      camera={{ position: [0, 4, 7], fov: 50 }}
      className="w-full h-full"
    >
      <ChromesthesiaSurface />
    </Canvas3D>
  );
}
