'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';

// Orbital ring config — fewer, subtle
const RING_COUNT = 3;
const RING_SEGMENTS = 96;

export default function AuroraRibbons() {
  const analyser = useAudioAnalyser();
  const smoothedAmp = useRef(0);
  const timeRef = useRef(0);

  // Orbital rings with slow breathing glow
  const rings = useMemo(() => {
    return Array.from({ length: RING_COUNT }, (_, i) => {
      const radius = 5.5 + i * 1.8;
      const geo = new THREE.TorusGeometry(radius, 0.006 + i * 0.002, 8, RING_SEGMENTS);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.3, 0.45, 0.8),
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return {
        geometry: geo,
        material: mat,
        orbitSpeed: 0.03 + i * 0.015, // very slow
        tiltX: (Math.PI / 3.5) + (i * 0.2),
        tiltZ: i * 0.15,
        phase: (i / RING_COUNT) * Math.PI * 2,
      };
    });
  }, []);

  const ringMeshRefs = useRef<(THREE.Mesh | null)[]>(new Array(RING_COUNT).fill(null));

  useFrame((_state, delta) => {
    const isPlaying = useAudioStore.getState().isPlaying;
    timeRef.current += delta;
    const t = timeRef.current;

    if (isPlaying) {
      analyser.update();
    }

    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    // Very slow amplitude tracking — breathing, not reacting
    if (hasAudio) {
      let sum = 0;
      for (let i = 0; i < normFreq.length; i++) sum += normFreq[i] * normFreq[i];
      const rms = Math.sqrt(sum / normFreq.length);
      smoothedAmp.current += (rms - smoothedAmp.current) * 0.03;
    } else {
      smoothedAmp.current += (0.0 - smoothedAmp.current) * 0.02;
    }

    const amp = smoothedAmp.current;

    // Update orbital rings — slow rotation, breathing opacity
    for (let i = 0; i < RING_COUNT; i++) {
      const ring = rings[i];
      const mesh = ringMeshRefs.current[i];
      if (!mesh) continue;

      // Very slow orbit
      const speed = ring.orbitSpeed;
      mesh.rotation.x = ring.tiltX + Math.sin(t * speed * 0.5 + ring.phase) * 0.15;
      mesh.rotation.y = t * speed;
      mesh.rotation.z = ring.tiltZ + Math.cos(t * speed * 0.3 + ring.phase) * 0.1;

      // Breathing opacity — slow sine wave modulated by audio energy
      const breathe = Math.sin(t * 0.4 + ring.phase) * 0.5 + 0.5; // 0-1 slow pulse
      const audioGlow = amp * 0.2;
      const targetOpacity = hasAudio
        ? 0.03 + breathe * 0.06 + audioGlow
        : 0.01 + breathe * 0.02;
      ring.material.opacity += (targetOpacity - ring.material.opacity) * 0.03;

      // Blue tinted glow — brighter with audio
      const brightness = 0.3 + amp * 0.4 + breathe * 0.15;
      ring.material.color.setRGB(
        brightness * 0.4,
        brightness * 0.55,
        brightness * 1.0
      );
    }
  });

  return (
    <group position={[0, 1.5, 0]}>
      {rings.map((ring, i) => (
        <mesh
          key={`ring-${i}`}
          ref={(el) => { ringMeshRefs.current[i] = el; }}
          geometry={ring.geometry}
          material={ring.material}
        />
      ))}
    </group>
  );
}
