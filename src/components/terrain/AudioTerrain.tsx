'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import terrainVertexShader from '@/lib/shaders/terrainVertex.glsl';
import terrainFragmentShader from '@/lib/shaders/terrainFragment.glsl';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';

interface AudioTerrainProps {
  version: 'released' | 'unreleased';
}

const SEGMENTS = 128;
const SIZE = 12;
const MAX_ELEVATION = 3.0;
const TRANSITION_DURATION = 1.2; // seconds

function generateHeight(x: number, z: number, released: boolean): number {
  const raw =
    Math.sin(x * 0.3) * Math.cos(z * 0.4) * 0.5 +
    Math.sin(x * 0.7 + z * 0.5) * 0.3 +
    Math.sin(x * 1.2) * Math.cos(z * 0.9) * 0.2 +
    Math.sin(x * 0.15 + z * 0.2) * 0.6 +
    Math.cos(x * 0.5 - z * 0.3) * Math.sin(z * 0.8) * 0.25;

  return released ? raw * MAX_ELEVATION : raw * MAX_ELEVATION * 0.05;
}

function buildHeights(released: boolean): Float32Array {
  const count = (SEGMENTS + 1) * (SEGMENTS + 1);
  const heights = new Float32Array(count);
  const half = SIZE / 2;
  const step = SIZE / SEGMENTS;

  for (let row = 0; row <= SEGMENTS; row++) {
    for (let col = 0; col <= SEGMENTS; col++) {
      const x = -half + col * step;
      const z = -half + row * step;
      heights[row * (SEGMENTS + 1) + col] = generateHeight(x, z, released);
    }
  }
  return heights;
}

export default function AudioTerrain({ version }: AudioTerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const transitionRef = useRef({
    active: false,
    from: null as Float32Array | null,
    to: null as Float32Array | null,
    progress: 0,
    targetColorMode: 0,
    startColorMode: 0,
  });

  const isPlaying = useAudioStore((s) => s.isPlaying);
  const analyser = useAudioAnalyser();

  const releasedHeights = useMemo(() => buildHeights(true), []);
  const unreleasedHeights = useMemo(() => buildHeights(false), []);

  // FFT DataTexture: 1024 x 1, single red channel, float
  const freqTexture = useMemo(() => {
    const data = new Float32Array(1024);
    const tex = new THREE.DataTexture(data, 1024, 1, THREE.RedFormat, THREE.FloatType);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    const positions = geo.attributes.position.array as Float32Array;
    const isReleased = version === 'released';
    const heights = isReleased ? releasedHeights : unreleasedHeights;

    for (let i = 0; i < heights.length; i++) {
      positions[i * 3 + 2] = heights[i];
    }

    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
    // Only run once on mount; transitions handle subsequent changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uniforms = useMemo(
    () => ({
      uColorMode: { value: 0.0 },
      uMaxHeight: { value: MAX_ELEVATION },
      uTime: { value: 0.0 },
      uAudioReactive: { value: 0.0 },
      uFrequencyTexture: { value: freqTexture },
    }),
    [freqTexture]
  );

  // Kick off a transition whenever version changes
  const prevVersion = useRef(version);
  useEffect(() => {
    if (prevVersion.current === version) return;
    prevVersion.current = version;

    const isReleased = version === 'released';
    const geo = meshRef.current?.geometry as THREE.PlaneGeometry | undefined;
    if (!geo) return;

    const positions = geo.attributes.position.array as Float32Array;
    const currentHeights = new Float32Array(releasedHeights.length);
    for (let i = 0; i < currentHeights.length; i++) {
      currentHeights[i] = positions[i * 3 + 2];
    }

    transitionRef.current = {
      active: true,
      from: currentHeights,
      to: isReleased ? releasedHeights : unreleasedHeights,
      progress: 0,
      startColorMode: materialRef.current?.uniforms.uColorMode.value ?? 0,
      targetColorMode: isReleased ? 0.0 : 1.0,
    };
  }, [version, releasedHeights, unreleasedHeights]);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }

    // Audio-reactive FFT update
    if (isPlaying) {
      analyser.update();
      const freqData = analyser.normalizedFrequency;
      const texData = freqTexture.image.data as Float32Array;
      for (let i = 0; i < Math.min(freqData.length, texData.length); i++) {
        texData[i] = freqData[i];
      }
      freqTexture.needsUpdate = true;

      if (materialRef.current) {
        materialRef.current.uniforms.uAudioReactive.value = 1.0;
      }
    } else {
      // When audio stops, freeze at last state (don't revert uAudioReactive or texture)
    }

    const t = transitionRef.current;
    if (!t.active || !t.from || !t.to) return;

    t.progress = Math.min(t.progress + delta / TRANSITION_DURATION, 1.0);
    // Smooth ease-in-out
    const ease =
      t.progress < 0.5
        ? 4 * t.progress * t.progress * t.progress
        : 1 - Math.pow(-2 * t.progress + 2, 3) / 2;

    const geo = meshRef.current?.geometry as THREE.PlaneGeometry | undefined;
    if (!geo) return;
    const positions = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < t.from.length; i++) {
      positions[i * 3 + 2] = t.from[i] + (t.to[i] - t.from[i]) * ease;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    if (materialRef.current) {
      materialRef.current.uniforms.uColorMode.value =
        t.startColorMode + (t.targetColorMode - t.startColorMode) * ease;
    }

    if (t.progress >= 1.0) {
      t.active = false;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
