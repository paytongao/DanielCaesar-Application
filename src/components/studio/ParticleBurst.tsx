'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import { detectBeat } from '@/lib/chromesthesia';

const POOL_SIZE = 2000;
const BURST_COUNT = 80;
const GRAVITY = -1.5;

interface Particle {
  alive: boolean;
  age: number;
  lifetime: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number;
  brightness: number;
}

const particleVertexShader = `
  attribute float aSize;
  attribute float aAlpha;

  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying float vAlpha;

  void main() {
    // Soft circle with glow
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float core = smoothstep(0.5, 0.1, dist);
    float glow = smoothstep(0.5, 0.0, dist) * 0.5;
    float alpha = (core + glow) * vAlpha;

    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

export default function ParticleBurst() {
  const analyser = useAudioAnalyser();
  const beatHistory = useRef<number[]>([]);
  const timeRef = useRef(0);
  const ambientTimer = useRef(0);

  // Particle pool
  const particles = useRef<Particle[]>(
    Array.from({ length: POOL_SIZE }, () => ({
      alive: false,
      age: 0,
      lifetime: 2,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      size: 1,
      brightness: 0.8,
    }))
  );

  // Three.js buffer attributes
  const { geometry, positions, colors, sizes, alphas } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(POOL_SIZE * 3);
    const col = new Float32Array(POOL_SIZE * 3);
    const sz = new Float32Array(POOL_SIZE);
    const al = new Float32Array(POOL_SIZE);

    for (let i = 0; i < POOL_SIZE; i++) {
      pos[i * 3 + 1] = -100;
      sz[i] = 0;
      al[i] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));

    return { geometry: geo, positions: pos, colors: col, sizes: sz, alphas: al };
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  }, []);

  function spawnBurst(count: number, intensity: number) {
    const pool = particles.current;
    let spawned = 0;
    for (let i = 0; i < POOL_SIZE && spawned < count; i++) {
      if (!pool[i].alive) {
        const p = pool[i];
        p.alive = true;
        p.age = 0;
        p.lifetime = 1.5 + Math.random() * 1.5;
        p.x = 0;
        p.y = 2 + Math.random() * 1;
        p.z = 0;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = (2 + Math.random() * 4) * intensity;
        p.vx = Math.sin(phi) * Math.cos(theta) * speed;
        p.vy = Math.sin(phi) * Math.sin(theta) * speed * 0.8 + 2;
        p.vz = Math.cos(phi) * speed;

        p.size = 0.3 + Math.random() * 0.5;
        p.brightness = 0.6 + Math.random() * 0.4;
        spawned++;
      }
    }
  }

  function spawnAmbient() {
    const pool = particles.current;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!pool[i].alive) {
        const p = pool[i];
        p.alive = true;
        p.age = 0;
        p.lifetime = 3 + Math.random() * 3;
        p.x = (Math.random() - 0.5) * 10;
        p.y = Math.random() * 4;
        p.z = (Math.random() - 0.5) * 10;
        p.vx = (Math.random() - 0.5) * 0.3;
        p.vy = 0.2 + Math.random() * 0.3;
        p.vz = (Math.random() - 0.5) * 0.3;
        p.size = 0.15 + Math.random() * 0.2;
        p.brightness = 0.4 + Math.random() * 0.3;
        break;
      }
    }
  }

  useFrame((_state, delta) => {
    const isPlaying = useAudioStore.getState().isPlaying;
    timeRef.current += delta;

    if (isPlaying) {
      analyser.update();
    }

    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    // Beat detection → spawn burst
    if (hasAudio) {
      const isBeat = detectBeat(normFreq, beatHistory.current, 1.3);
      if (isBeat) {
        spawnBurst(BURST_COUNT, 1.0);
      }
    }

    // Ambient particles
    ambientTimer.current += delta;
    const ambientInterval = hasAudio ? 0.15 : 0.3;
    if (ambientTimer.current > ambientInterval) {
      ambientTimer.current = 0;
      spawnAmbient();
    }

    // Update all particles
    const pool = particles.current;
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.alive) {
        positions[i * 3 + 1] = -100;
        alphas[i] = 0;
        sizes[i] = 0;
        continue;
      }

      p.age += delta;
      if (p.age >= p.lifetime) {
        p.alive = false;
        positions[i * 3 + 1] = -100;
        alphas[i] = 0;
        sizes[i] = 0;
        continue;
      }

      // Physics
      p.vy += GRAVITY * delta;
      p.vx *= 0.99;
      p.vz *= 0.99;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      const lifeRatio = p.age / p.lifetime;
      const fadeIn = Math.min(1, p.age * 10);
      const fadeOut = 1 - Math.pow(lifeRatio, 2);

      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      sizes[i] = p.size * (1 - lifeRatio * 0.5);
      alphas[i] = fadeIn * fadeOut * 0.8;

      // Monochrome white/silver color
      const b = p.brightness * (1 - lifeRatio * 0.4);
      colors[i * 3] = b * 0.9;
      colors[i * 3 + 1] = b * 0.92;
      colors[i * 3 + 2] = b;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    (geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points geometry={geometry} material={material} />
  );
}
