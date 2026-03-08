'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';

interface OrbConfig {
  position: [number, number, number];
  radius: number;
  color: THREE.Color;
  speed: [number, number, number]; // drift speed on each axis
  phase: number;
  baseOpacity: number;
}

const ORB_COUNT = 7;

// Blue palette orb colors
const ORB_COLORS = [
  new THREE.Color(0.05, 0.15, 0.6),   // deep navy
  new THREE.Color(0.1, 0.3, 0.9),     // royal blue
  new THREE.Color(0.2, 0.5, 1.0),     // neon blue
  new THREE.Color(0.1, 0.2, 0.5),     // dark blue
  new THREE.Color(0.3, 0.6, 1.0),     // bright blue
  new THREE.Color(0.15, 0.35, 0.8),   // medium blue
  new THREE.Color(0.4, 0.7, 1.0),     // light cyan-blue
];

export default function GlowOrbs() {
  const analyser = useAudioAnalyser();
  const smoothedAmp = useRef(0);
  const timeRef = useRef(0);

  const orbs = useMemo<OrbConfig[]>(() => {
    return Array.from({ length: ORB_COUNT }, (_, i) => {
      const angle = (i / ORB_COUNT) * Math.PI * 2;
      const dist = 4 + Math.random() * 6;
      const y = -1 + Math.random() * 6;
      return {
        position: [
          Math.cos(angle) * dist,
          y,
          Math.sin(angle) * dist,
        ] as [number, number, number],
        radius: 0.8 + Math.random() * 1.5,
        color: ORB_COLORS[i % ORB_COLORS.length],
        speed: [
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.15,
        ] as [number, number, number],
        phase: Math.random() * Math.PI * 2,
        baseOpacity: 0.06 + Math.random() * 0.08,
      };
    });
  }, []);

  const materials = useMemo(() => {
    return orbs.map((orb) => {
      return new THREE.MeshBasicMaterial({
        color: orb.color,
        transparent: true,
        opacity: orb.baseOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      });
    });
  }, [orbs]);

  const sphereGeo = useMemo(() => {
    return new THREE.SphereGeometry(1, 24, 24);
  }, []);

  const meshRefs = useRef<(THREE.Mesh | null)[]>(new Array(ORB_COUNT).fill(null));

  useFrame((_state, delta) => {
    const isPlaying = useAudioStore.getState().isPlaying;
    timeRef.current += delta;
    const t = timeRef.current;

    if (isPlaying) {
      analyser.update();
    }

    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    if (hasAudio) {
      let sum = 0;
      for (let i = 0; i < normFreq.length; i++) sum += normFreq[i] * normFreq[i];
      const rms = Math.sqrt(sum / normFreq.length);
      smoothedAmp.current += (rms - smoothedAmp.current) * 0.05;
    } else {
      smoothedAmp.current += (0.0 - smoothedAmp.current) * 0.02;
    }

    const amp = smoothedAmp.current;

    for (let i = 0; i < ORB_COUNT; i++) {
      const mesh = meshRefs.current[i];
      const orb = orbs[i];
      if (!mesh) continue;

      // Slow drift motion
      const dx = Math.sin(t * orb.speed[0] + orb.phase) * 1.5;
      const dy = Math.sin(t * orb.speed[1] + orb.phase * 1.3) * 0.8;
      const dz = Math.cos(t * orb.speed[2] + orb.phase * 0.7) * 1.5;

      mesh.position.set(
        orb.position[0] + dx,
        orb.position[1] + dy,
        orb.position[2] + dz,
      );

      // Slow breathing scale
      const breathe = 1 + Math.sin(t * 0.3 + orb.phase) * 0.15;
      const audioScale = 1 + amp * 0.8;
      const s = orb.radius * breathe * audioScale;
      mesh.scale.setScalar(s);

      // Breathing opacity with audio boost
      const opBreath = Math.sin(t * 0.25 + orb.phase * 1.5) * 0.5 + 0.5;
      materials[i].opacity = orb.baseOpacity * (0.6 + opBreath * 0.4) + amp * 0.06;
    }
  });

  return (
    <group>
      {orbs.map((_, i) => (
        <mesh
          key={`orb-${i}`}
          ref={(el) => { meshRefs.current[i] = el; }}
          geometry={sphereGeo}
          material={materials[i]}
        />
      ))}
    </group>
  );
}
