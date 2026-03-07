'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import Canvas3D from '@/components/shared/Canvas3D';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import { hslToRgb } from '@/components/shared/ColorUtils';
import {
  aggregateFrequencyBands,
  gaussianSmooth1D,
  laplacianSmoothY,
  fftBinToHz,
} from '@/lib/chromesthesia';

const SIZE = 8;
const SEGMENTS = 80;
const VERTEX_COUNT = (SEGMENTS + 1) * (SEGMENTS + 1);

// Scriabin hues for MIDI semitone lookup
const SCRIABIN_HUES = [0, 20, 35, 50, 60, 120, 165, 180, 210, 240, 270, 290];

/**
 * Find the dominant pitch from FFT data and return its Scriabin hue.
 * Scans for the peak frequency bin, converts to MIDI note, looks up hue.
 */
function detectDominantHue(normFreq: Float32Array): number {
  // Find the bin with the highest amplitude (skip bin 0 = DC offset)
  let peakBin = 1;
  let peakVal = 0;
  for (let i = 1; i < normFreq.length; i++) {
    if (normFreq[i] > peakVal) {
      peakVal = normFreq[i];
      peakBin = i;
    }
  }

  // Convert peak bin to Hz, then to MIDI semitone
  const hz = fftBinToHz(peakBin);
  if (hz <= 0) return 270; // fallback: blue
  const midiNote = Math.round(69 + 12 * Math.log2(hz / 440));
  const semitone = ((midiNote % 12) + 12) % 12;
  return SCRIABIN_HUES[semitone];
}

export function ChromesthesiaSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);

  const analyser = useAudioAnalyser();

  // Smoothed frequency bands for temporal interpolation
  const smoothedBands = useRef(new Float32Array(SEGMENTS + 1));
  // Smoothed dominant hue (so color shifts are gradual, not jarring)
  const smoothedHue = useRef(270); // start blue

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

    // Detect dominant pitch color from actual audio
    let dominantHue = smoothedHue.current;
    if (hasAudio) {
      const rawHue = detectDominantHue(normFreq);
      // Smooth hue transitions (shortest path around the 360 wheel)
      let diff = rawHue - smoothedHue.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      smoothedHue.current = ((smoothedHue.current + diff * 0.08) % 360 + 360) % 360;
      dominantHue = smoothedHue.current;
    } else {
      // Slowly drift hue when idle
      smoothedHue.current = (smoothedHue.current + delta * 8) % 360;
      dominantHue = smoothedHue.current;
    }

    // Get frequency bands — mirrored so peaks radiate from center
    let bands: number[];
    if (hasAudio) {
      const halfSegs = Math.floor((SEGMENTS + 1) / 2);
      const raw = aggregateFrequencyBands(normFreq, halfSegs);
      const smoothed = gaussianSmooth1D(raw, 2);
      // Power curve to amplify peaks and suppress flat regions
      for (let i = 0; i < halfSegs; i++) {
        smoothed[i] = Math.pow(smoothed[i], 0.7) * 1.5;
      }
      // Mirror: center = low freq (bass), edges = high freq
      bands = new Array(SEGMENTS + 1);
      const mid = Math.floor(SEGMENTS / 2);
      for (let i = 0; i <= SEGMENTS; i++) {
        const distFromCenter = Math.abs(i - mid);
        const idx = Math.min(distFromCenter, halfSegs - 1);
        bands[i] = smoothed[idx];
      }
    } else {
      // Flat — no displacement until audio plays
      bands = new Array(SEGMENTS + 1).fill(0);
    }

    // Temporal smoothing
    const prev = smoothedBands.current;
    const alpha = 0.3;
    for (let i = 0; i <= SEGMENTS; i++) {
      prev[i] += (bands[i] - prev[i]) * alpha;
    }

    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;
    const posArr = positions.array as Float32Array;
    const colArr = colors.array as Float32Array;

    const scale = 8.0; // Much more extreme displacement

    // Displace Y by frequency amplitude
    for (let i = 0; i < positions.count; i++) {
      const ix = i % (SEGMENTS + 1);
      const iy = Math.floor(i / (SEGMENTS + 1));

      const bandValue = prev[ix];
      const crossBand = prev[iy];

      // Cross-fade with sharper peaks preserved
      const height = (bandValue * 0.75 + crossBand * 0.25) * scale;

      // Subtle organic wave only when audio is playing
      let wave = 0;
      if (hasAudio) {
        const nx = ix / SEGMENTS;
        const ny = iy / SEGMENTS;
        wave = Math.sin(t * 0.8 + nx * 6 + ny * 4) * 0.12 * scale;
      }

      posArr[i * 3 + 1] = height + wave;
    }

    // Less Laplacian smoothing to keep peaks visible
    laplacianSmoothY(posArr, SEGMENTS + 1, SEGMENTS + 1, 1);

    // Color: single dominant pitch hue, amplitude modulates saturation + lightness
    for (let i = 0; i < positions.count; i++) {
      const amp = Math.min(1, Math.max(0, posArr[i * 3 + 1] / scale));

      // Hue = dominant pitch, slight variation with height for depth
      const hueShift = (amp - 0.5) * 30; // ±15° variation based on height
      const hue = ((dominantHue + hueShift) % 360 + 360) % 360;
      const saturation = 0.5 + amp * 0.4; // 50-90%
      const lightness = 0.15 + amp * 0.45; // 15-60% — dark valleys, bright peaks

      const [r, g, b] = hslToRgb(hue, saturation, lightness);
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
      camera={{ position: [0, 5, 8], fov: 50 }}
      className="w-full h-full"
    >
      <ChromesthesiaSurface />
    </Canvas3D>
  );
}
