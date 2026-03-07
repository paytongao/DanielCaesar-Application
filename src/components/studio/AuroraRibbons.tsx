'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import { fftBinToHz } from '@/lib/chromesthesia';

const SCRIABIN_HUES = [0, 20, 35, 50, 60, 120, 165, 180, 210, 240, 270, 290];

const RIBBON_COUNT = 5;
const RIBBON_SEGMENTS = 80;

const auroraVertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uPhase;

  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    vUv = uv;

    vec3 pos = position;

    // Multiple octaves of sine waves for organic ribbon motion
    float wave1 = sin(pos.y * 2.0 + uTime * 0.8 + uPhase) * 1.2;
    float wave2 = sin(pos.y * 3.5 + uTime * 1.2 + uPhase * 1.7) * 0.6;
    float wave3 = sin(pos.y * 5.0 + uTime * 0.5 + uPhase * 0.3) * 0.3;
    float wave4 = sin(pos.y * 1.2 + uTime * 2.0 + uPhase * 2.1) * 0.4;

    float totalWave = (wave1 + wave2 + wave3 + wave4) * (0.5 + uAmplitude * 1.5);

    pos.x += totalWave;
    // Gentle Z sway
    pos.z += sin(pos.y * 1.8 + uTime * 0.6 + uPhase * 0.5) * 0.5 * (0.3 + uAmplitude);

    vDisplacement = totalWave * 0.15;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const auroraFragmentShader = `
  uniform float uTime;
  uniform float uHue;
  uniform float uAmplitude;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vDisplacement;

  vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float hp = h / 60.0;
    float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
    float m = l - c * 0.5;
    vec3 rgb;
    if (hp < 1.0) rgb = vec3(c, x, 0.0);
    else if (hp < 2.0) rgb = vec3(x, c, 0.0);
    else if (hp < 3.0) rgb = vec3(0.0, c, x);
    else if (hp < 4.0) rgb = vec3(0.0, x, c);
    else if (hp < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
  }

  void main() {
    // Horizontal fade: transparent at edges, bright at center
    float edgeFade = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);

    // Vertical fade: stronger in the middle, fades at top and bottom
    float vertFade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.6, vUv.y);

    // Shimmer based on displacement
    float shimmer = 0.7 + abs(vDisplacement) * 2.0;

    // Color: base hue with slight variation along Y
    float hueVar = sin(vUv.y * 6.28 + uTime * 0.3) * 20.0;
    float hue = mod(uHue + hueVar, 360.0);
    float sat = 0.7 + uAmplitude * 0.25;
    float lit = 0.2 + shimmer * 0.3 + uAmplitude * 0.2;

    vec3 color = hsl2rgb(hue, sat, lit);

    float alpha = edgeFade * vertFade * uOpacity * (0.3 + uAmplitude * 0.5);

    gl_FragColor = vec4(color, alpha);
  }
`;

function detectDominantHue(normFreq: Float32Array): number {
  let peakBin = 1;
  let peakVal = 0;
  for (let i = 1; i < normFreq.length; i++) {
    if (normFreq[i] > peakVal) {
      peakVal = normFreq[i];
      peakBin = i;
    }
  }
  const hz = fftBinToHz(peakBin);
  if (hz <= 0) return 270;
  const midiNote = Math.round(69 + 12 * Math.log2(hz / 440));
  const semitone = ((midiNote % 12) + 12) % 12;
  return SCRIABIN_HUES[semitone];
}

export default function AuroraRibbons() {
  const analyser = useAudioAnalyser();
  const smoothedHue = useRef(270);
  const smoothedAmp = useRef(0);

  // Create ribbon materials with unique phases
  const ribbons = useMemo(() => {
    return Array.from({ length: RIBBON_COUNT }, (_, i) => {
      const phase = (i / RIBBON_COUNT) * Math.PI * 2;
      const xPos = (i - (RIBBON_COUNT - 1) / 2) * 3.5;

      const material = new THREE.ShaderMaterial({
        vertexShader: auroraVertexShader,
        fragmentShader: auroraFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uHue: { value: 270 },
          uAmplitude: { value: 0 },
          uPhase: { value: phase },
          uOpacity: { value: 0.4 + (i % 2) * 0.2 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const geometry = new THREE.PlaneGeometry(2, 8, 1, RIBBON_SEGMENTS);

      return { material, geometry, xPos, zPos: -4 - i * 0.5 };
    });
  }, []);

  useFrame((_state, delta) => {
    const isPlaying = useAudioStore.getState().isPlaying;
    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    // Detect dominant hue
    if (hasAudio) {
      const rawHue = detectDominantHue(normFreq);
      let diff = rawHue - smoothedHue.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      smoothedHue.current = ((smoothedHue.current + diff * 0.06) % 360 + 360) % 360;

      // Overall amplitude
      let totalEnergy = 0;
      for (let i = 0; i < normFreq.length; i++) totalEnergy += normFreq[i];
      const avgEnergy = totalEnergy / normFreq.length;
      smoothedAmp.current += (avgEnergy - smoothedAmp.current) * 0.1;
    } else {
      smoothedHue.current = (smoothedHue.current + delta * 6) % 360;
      smoothedAmp.current += (0.15 - smoothedAmp.current) * 0.05;
    }

    // Update all ribbon uniforms
    for (const ribbon of ribbons) {
      ribbon.material.uniforms.uTime.value += delta;
      ribbon.material.uniforms.uHue.value = smoothedHue.current;
      ribbon.material.uniforms.uAmplitude.value = smoothedAmp.current;
    }
  });

  return (
    <group>
      {ribbons.map((ribbon, i) => (
        <mesh
          key={i}
          geometry={ribbon.geometry}
          material={ribbon.material}
          position={[ribbon.xPos, 2, ribbon.zPos]}
        />
      ))}
    </group>
  );
}
