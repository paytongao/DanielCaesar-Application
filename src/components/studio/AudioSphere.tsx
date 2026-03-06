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
} from '@/lib/chromesthesia';

const SEGMENTS = 96;
const RINGS = 64;

function ChromesthesiaSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const analyser = useAudioAnalyser();

  // Store base positions for displacement reference
  const basePositions = useMemo(() => {
    const geo = new THREE.SphereGeometry(2, SEGMENTS, RINGS);
    return new Float32Array(geo.attributes.position.array);
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(2, SEGMENTS, RINGS);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  // Smoothed band values for interpolation
  const smoothedBands = useRef(new Float32Array(SEGMENTS + 1));

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

    // Get frequency bands
    let bands: number[];
    if (hasAudio) {
      const raw = aggregateFrequencyBands(normFreq, SEGMENTS + 1);
      bands = gaussianSmooth1D(raw, 3);
    } else {
      // Procedural breathing animation
      bands = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const nx = i / SEGMENTS;
        const wave1 = Math.sin(t * 1.2 + nx * Math.PI * 4) * 0.15;
        const wave2 = Math.sin(t * 0.8 + nx * Math.PI * 6) * 0.1;
        const wave3 = Math.cos(t * 0.5 + nx * Math.PI * 2) * 0.08;
        const breathe = Math.sin(t * 0.3) * 0.05 + 0.12;
        bands.push(Math.max(0.02, wave1 + wave2 + wave3 + breathe));
      }
    }

    // Temporal smoothing
    const prev = smoothedBands.current;
    const alpha = 0.15;
    for (let i = 0; i <= SEGMENTS; i++) {
      prev[i] += (bands[i] - prev[i]) * alpha;
    }

    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;
    const posArr = positions.array as Float32Array;
    const colArr = colors.array as Float32Array;

    for (let i = 0; i < positions.count; i++) {
      // Get base position on unit sphere
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];

      // Spherical coordinates from base position
      const r = Math.sqrt(bx * bx + by * by + bz * bz);
      const theta = Math.acos(by / r); // polar angle (0 = top, PI = bottom)
      const phi = Math.atan2(bz, bx);   // azimuthal angle

      // Map theta to frequency band (top = low freq, bottom = high freq)
      const freqNorm = theta / Math.PI;
      const bandIdx = Math.min(SEGMENTS, Math.floor(freqNorm * SEGMENTS));
      const bandValue = prev[bandIdx];

      // Also use phi for secondary modulation
      const phiMod = Math.sin(phi * 3 + t * 0.5) * 0.03;

      // Displacement: radial push based on amplitude
      const displacement = 1.0 + bandValue * 2.5 + phiMod;

      // Normalize direction and apply displacement
      const nx = bx / r;
      const ny = by / r;
      const nz = bz / r;
      posArr[i * 3] = nx * r * displacement;
      posArr[i * 3 + 1] = ny * r * displacement;
      posArr[i * 3 + 2] = nz * r * displacement;

      // Color: chromesthesia based on frequency position + amplitude
      const [cr, cg, cb] = smoothChromesthesiaColor(freqNorm, Math.min(1, bandValue * 1.5));
      colArr[i * 3] = cr;
      colArr[i * 3 + 1] = cg;
      colArr[i * 3 + 2] = cb;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geometry.computeVertexNormals();

    // Slow rotation
    meshRef.current.rotation.y += delta * 0.1;
    meshRef.current.rotation.x = Math.sin(t * 0.15) * 0.1;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.4}
        metalness={0.15}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function AudioSphere() {
  return (
    <Canvas3D
      camera={{ position: [0, 0, 7], fov: 50 }}
      className="w-full h-full"
    >
      <ChromesthesiaSphere />
    </Canvas3D>
  );
}
