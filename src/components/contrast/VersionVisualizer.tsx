'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import Canvas3D from '@/components/shared/Canvas3D';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import { frequencyBinToColor } from '@/lib/chromesthesia';

interface VersionVisualizerProps {
  theme: 'purple' | 'grey';
  label: string;
  isPlaying: boolean;
}

const BAR_COUNT = 48;
const COLS = 8;
const SMOOTHING = 0.12;

function BarGrid3D({ theme }: { theme: 'purple' | 'grey' }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const barsRef = useRef(new Float32Array(BAR_COUNT).fill(0));
  const timeRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const isPurple = theme === 'purple';

  const analyser = useAudioAnalyser();

  const colorArray = useMemo(() => new Float32Array(BAR_COUNT * 3), []);

  // Attach instance colors on mount
  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const isPlaying = useAudioStore.getState().isPlaying;

    if (isPlaying) {
      timeRef.current += delta;
      analyser.update();
    }
    const t = timeRef.current;

    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    for (let i = 0; i < BAR_COUNT; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      let target: number;

      if (hasAudio) {
        const binIndex = Math.floor((i / BAR_COUNT) * normFreq.length);
        const binValue = normFreq[Math.min(binIndex, normFreq.length - 1)];
        target = isPurple ? binValue : binValue * 0.1;
      } else if (isPurple) {
        const wave1 = Math.sin(t * 2.3 + i * 0.35) * 0.3;
        const wave2 = Math.sin(t * 3.7 + i * 0.18) * 0.25;
        const wave3 = Math.cos(t * 1.1 + i * 0.55) * 0.2;
        const bass = i < 8 ? Math.sin(t * 1.8) * 0.3 + 0.4 : 0;
        const mid = i > 10 && i < 30 ? Math.sin(t * 2.5 + i * 0.2) * 0.2 + 0.15 : 0;
        const high = i > 30 ? Math.sin(t * 4.2 + i * 0.4) * 0.15 : 0;
        const envelope = Math.sin(t * 0.4) * 0.15 + 0.5;
        target = Math.max(0.05, (wave1 + wave2 + wave3 + bass + mid + high) * envelope + 0.35);
        if (Math.sin(t * 5.1 + i * 1.7) > 0.85) {
          target = Math.min(1, target + 0.3);
        }
      } else {
        const freq = i / BAR_COUNT;
        const wave1 = Math.sin(t * 0.8 + i * 0.12) * 0.04;
        const wave2 = Math.sin(t * 1.2 + i * 0.08) * 0.03;
        const base = 0.12 - freq * 0.04;
        target = Math.max(0.03, base + wave1 + wave2);
        if (i < 6) target += 0.04;
      }

      barsRef.current[i] += (target - barsRef.current[i]) * SMOOTHING;

      const barValue = barsRef.current[i];
      const scaleY = barValue * 4.0;
      const x = (col - 3.5) * 0.25;
      const z = (row - 2.5) * 0.25;

      dummy.position.set(x, scaleY / 2, z);
      dummy.scale.set(1, Math.max(0.02, scaleY), 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Colors
      const ci = i * 3;
      if (isPurple) {
        const binIndex = Math.floor((i / BAR_COUNT) * 1024);
        const [r, g, b] = frequencyBinToColor(binIndex, barValue);
        colorArray[ci] = r;
        colorArray[ci + 1] = g;
        colorArray[ci + 2] = b;
      } else {
        colorArray[ci] = 0.3;
        colorArray[ci + 1] = 0.3;
        colorArray[ci + 2] = 0.3;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;

    // Set instance colors
    const colorAttr = mesh.geometry.getAttribute('instanceColor');
    if (!colorAttr) {
      mesh.geometry.setAttribute(
        'instanceColor',
        new THREE.InstancedBufferAttribute(colorArray, 3)
      );
      // Force material to use instance colors
      (mesh.material as THREE.MeshStandardMaterial).vertexColors = true;
      (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
    } else {
      (colorAttr as THREE.InstancedBufferAttribute).set(colorArray);
      colorAttr.needsUpdate = true;
    }

    // Update material emissive for purple
    if (isPurple) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      // Use average amplitude for global emissive
      let avgAmp = 0;
      for (let i = 0; i < BAR_COUNT; i++) avgAmp += barsRef.current[i];
      avgAmp /= BAR_COUNT;
      mat.emissive.setRGB(0.4 * avgAmp * 0.3, 0.15 * avgAmp * 0.3, 0.7 * avgAmp * 0.3);
    }

    // Auto-rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  const materialProps = isPurple
    ? { roughness: 0.4, metalness: 0.2, toneMapped: false }
    : { roughness: 0.8, metalness: 0.0, toneMapped: false };

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, BAR_COUNT]}>
        <boxGeometry args={[0.18, 1, 0.18]} />
        <meshStandardMaterial {...materialProps} />
      </instancedMesh>
    </group>
  );
}

export default function VersionVisualizer({ theme, label }: VersionVisualizerProps) {
  const isPurple = theme === 'purple';

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Label */}
      <div className="absolute top-4 left-0 right-0 z-10 text-center pointer-events-none">
        <h3
          className={`text-xs tracking-[0.3em] uppercase font-mono ${
            isPurple ? 'text-purple-300/80' : 'text-neutral-500/80'
          }`}
        >
          {isPurple ? 'Released' : 'Unreleased'}
        </h3>
        <p
          className={`mt-1 text-sm font-medium ${
            isPurple ? 'text-purple-100' : 'text-neutral-400'
          }`}
        >
          {label}
        </p>
      </div>

      <Canvas3D
        camera={{ position: [2.5, 3, 4], fov: 50 }}
        className="w-full h-full"
      >
        <BarGrid3D theme={theme} />
      </Canvas3D>
    </div>
  );
}
