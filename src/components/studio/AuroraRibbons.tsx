'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import { detectBeat } from '@/lib/chromesthesia';

// Orbital ring config
const RING_COUNT = 5;
const RING_SEGMENTS = 128;

// Ripple config
const MAX_RIPPLES = 6;

interface Ripple {
  alive: boolean;
  age: number;
  lifetime: number;
  radius: number;
  speed: number;
  intensity: number;
}

/**
 * Creates a torus ring geometry for orbital lights.
 */
function createRingGeometry(radius: number, tube: number): THREE.TorusGeometry {
  return new THREE.TorusGeometry(radius, tube, 8, RING_SEGMENTS);
}

/**
 * Creates a flat ring geometry for ripple waves.
 */
function createRippleGeometry(): THREE.RingGeometry {
  return new THREE.RingGeometry(0.5, 1.0, 64, 1);
}

export default function AuroraRibbons() {
  const analyser = useAudioAnalyser();
  const smoothedAmp = useRef(0);
  const beatBoost = useRef(0);
  const beatHistory = useRef<number[]>([]);
  const timeRef = useRef(0);

  // Ripple pool
  const ripples = useRef<Ripple[]>(
    Array.from({ length: MAX_RIPPLES }, () => ({
      alive: false,
      age: 0,
      lifetime: 3,
      radius: 0,
      speed: 3,
      intensity: 1,
    }))
  );

  // Orbital rings
  const rings = useMemo(() => {
    return Array.from({ length: RING_COUNT }, (_, i) => {
      const radius = 2.5 + i * 0.8;
      const geo = createRingGeometry(radius, 0.015 + i * 0.005);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.6, 0.65, 0.8),
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return {
        geometry: geo,
        material: mat,
        orbitSpeed: 0.15 + i * 0.08,
        tiltX: (Math.PI / 4) + (i * 0.25),
        tiltZ: i * 0.3,
        phase: (i / RING_COUNT) * Math.PI * 2,
        baseRadius: radius,
      };
    });
  }, []);

  // Ripple meshes
  const rippleMeshes = useMemo(() => {
    return Array.from({ length: MAX_RIPPLES }, () => {
      const geo = createRippleGeometry();
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.7, 0.75, 0.9),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return { geometry: geo, material: mat };
    });
  }, []);

  // Refs to mesh objects for runtime transforms
  const ringMeshRefs = useRef<(THREE.Mesh | null)[]>(new Array(RING_COUNT).fill(null));
  const rippleMeshRefs = useRef<(THREE.Mesh | null)[]>(new Array(MAX_RIPPLES).fill(null));

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
      smoothedAmp.current += (rms - smoothedAmp.current) * 0.15;

      const isBeat = detectBeat(normFreq, beatHistory.current, 1.3);
      if (isBeat) {
        beatBoost.current = 1.0;

        // Spawn a ripple on beat
        const pool = ripples.current;
        for (let i = 0; i < MAX_RIPPLES; i++) {
          if (!pool[i].alive) {
            pool[i].alive = true;
            pool[i].age = 0;
            pool[i].lifetime = 2.5 + Math.random() * 1.5;
            pool[i].radius = 0.5;
            pool[i].speed = 2.5 + Math.random() * 2;
            pool[i].intensity = 0.7 + smoothedAmp.current * 2;
            break;
          }
        }
      }
    } else {
      smoothedAmp.current += (0.05 - smoothedAmp.current) * 0.03;
    }

    beatBoost.current *= 0.92;
    const amp = smoothedAmp.current + beatBoost.current * 0.4;

    // Update orbital rings
    for (let i = 0; i < RING_COUNT; i++) {
      const ring = rings[i];
      const mesh = ringMeshRefs.current[i];
      if (!mesh) continue;

      // Orbit rotation
      const speed = ring.orbitSpeed * (1 + amp * 2);
      mesh.rotation.x = ring.tiltX + Math.sin(t * speed + ring.phase) * 0.3;
      mesh.rotation.y = t * speed;
      mesh.rotation.z = ring.tiltZ + Math.cos(t * speed * 0.7 + ring.phase) * 0.2;

      // Pulse scale with beat
      const pulseScale = 1 + beatBoost.current * 0.3;
      mesh.scale.setScalar(pulseScale);

      // Opacity: visible when audio plays, brighter on beats
      const targetOpacity = hasAudio
        ? 0.15 + amp * 0.5 + beatBoost.current * 0.3
        : 0.03 + Math.sin(t * 0.5 + ring.phase) * 0.02;
      ring.material.opacity += (targetOpacity - ring.material.opacity) * 0.1;

      // Color shift with amplitude — brighter white on louder audio
      const brightness = 0.5 + amp * 0.5;
      ring.material.color.setRGB(
        brightness * 0.85,
        brightness * 0.9,
        brightness * 1.0
      );
    }

    // Update ripples
    const pool = ripples.current;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const ripple = pool[i];
      const mesh = rippleMeshRefs.current[i];
      if (!mesh) continue;

      if (!ripple.alive) {
        rippleMeshes[i].material.opacity = 0;
        mesh.scale.setScalar(0.01);
        continue;
      }

      ripple.age += delta;
      if (ripple.age >= ripple.lifetime) {
        ripple.alive = false;
        rippleMeshes[i].material.opacity = 0;
        mesh.scale.setScalar(0.01);
        continue;
      }

      // Expand outward
      ripple.radius += ripple.speed * delta;
      const scale = ripple.radius;
      mesh.scale.set(scale, scale, scale);

      // Fade out as it expands
      const lifeRatio = ripple.age / ripple.lifetime;
      const fadeOut = 1 - lifeRatio * lifeRatio;
      rippleMeshes[i].material.opacity = fadeOut * ripple.intensity * 0.4;

      // Slight ring thickness pulse
      const brightness = (0.6 + (1 - lifeRatio) * 0.4);
      rippleMeshes[i].material.color.setRGB(
        brightness * 0.8,
        brightness * 0.85,
        brightness * 1.0
      );
    }
  });

  return (
    <group position={[0, 1.5, 0]}>
      {/* Orbital rings */}
      {rings.map((ring, i) => (
        <mesh
          key={`ring-${i}`}
          ref={(el) => { ringMeshRefs.current[i] = el; }}
          geometry={ring.geometry}
          material={ring.material}
        />
      ))}

      {/* Beat ripples — horizontal rings expanding outward */}
      {rippleMeshes.map((ripple, i) => (
        <mesh
          key={`ripple-${i}`}
          ref={(el) => { rippleMeshRefs.current[i] = el; }}
          geometry={ripple.geometry}
          material={ripple.material}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[0.01, 0.01, 0.01]}
        />
      ))}
    </group>
  );
}
