'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import { detectBeat } from '@/lib/chromesthesia';

// Aurora curtain config
const CURTAIN_COUNT = 4;
const X_SEGS = 40;
const Y_SEGS = 60;

const auroraVertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uPhase;
  uniform float uCurvature;

  varying vec2 vUv;
  varying float vHeight;
  varying float vDisplacement;

  void main() {
    vUv = uv;

    vec3 pos = position;

    // Curtain curvature: bend the sheet into an arc in XZ plane
    float angle = (uv.x - 0.5) * uCurvature;
    float radius = 6.0;
    float curvedX = sin(angle) * radius;
    float curvedZ = cos(angle) * radius - radius;
    pos.x = curvedX;
    pos.z += curvedZ;

    // Multi-octave displacement — more dramatic with audio
    float wave1 = sin(pos.y * 1.5 + uTime * 0.6 + uPhase) * 1.0;
    float wave2 = sin(pos.y * 3.0 + uTime * 1.0 + uPhase * 1.7) * 0.5;
    float wave3 = sin(uv.x * 8.0 + pos.y * 2.0 + uTime * 0.8 + uPhase * 0.5) * 0.4;
    float wave4 = sin(uv.x * 4.0 + uTime * 1.5 + uPhase * 2.3) * 0.3;

    float totalWave = (wave1 + wave2 + wave3 + wave4) * (0.3 + uAmplitude * 4.0);

    // Displace along the local normal (outward from curve center)
    float nx = sin(angle);
    float nz = cos(angle);
    pos.x += nx * totalWave * 0.5;
    pos.z += nz * totalWave * 0.5;

    // Additional vertical ripple for 3D billowing
    pos.z += sin(uv.x * 6.28 + pos.y * 2.5 + uTime * 0.7) * 0.8 * (0.3 + uAmplitude * 2.0);
    pos.x += cos(pos.y * 1.8 + uTime * 0.5 + uPhase) * 0.4 * (0.2 + uAmplitude * 1.5);

    vHeight = uv.y;
    vDisplacement = totalWave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const auroraFragmentShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vHeight;
  varying float vDisplacement;

  void main() {
    // Vertical curtain fade
    float vertFade = smoothstep(0.0, 0.15, vHeight) * smoothstep(1.0, 0.5, vHeight);
    // Aurora crown at top
    float crown = smoothstep(0.7, 1.0, vHeight) * 1.5;

    // Horizontal fade at edges
    float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);

    // Shimmer from displacement
    float shimmer = 0.5 + abs(vDisplacement) * 0.5;

    // Vertical aurora ray streaks
    float streaks = abs(sin(vUv.x * 30.0 + vHeight * 2.0 + uTime * 0.3)) * 0.3;

    // Monochrome silver-white coloring
    float brightness = 0.4 + (shimmer + streaks + crown) * 0.25 + uAmplitude * 0.4;
    // Cool silver tint
    vec3 color = vec3(
      brightness * 0.85,
      brightness * 0.88,
      brightness * 1.0
    );

    // Emissive glow boost
    color *= 1.0 + crown * 0.4 + uAmplitude * 0.5;

    float alpha = edgeFade * vertFade * uOpacity * (0.2 + uAmplitude * 0.7);

    gl_FragColor = vec4(color, alpha);
  }
`;

export default function AuroraRibbons() {
  const analyser = useAudioAnalyser();
  const smoothedAmp = useRef(0);
  const beatBoost = useRef(0);
  const beatHistory = useRef<number[]>([]);

  const curtains = useMemo(() => {
    return Array.from({ length: CURTAIN_COUNT }, (_, i) => {
      const phase = (i / CURTAIN_COUNT) * Math.PI * 2;
      const angle = ((i / (CURTAIN_COUNT - 1)) - 0.5) * Math.PI * 0.6;
      const dist = 5 + i * 1.2;
      const xPos = Math.sin(angle) * dist;
      const zPos = -Math.cos(angle) * dist;
      const yRot = -angle;
      const curvature = 0.8 + i * 0.3;

      const material = new THREE.ShaderMaterial({
        vertexShader: auroraVertexShader,
        fragmentShader: auroraFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: 0 },
          uPhase: { value: phase },
          uOpacity: { value: 0.35 + (i % 2) * 0.15 },
          uCurvature: { value: curvature },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const geometry = new THREE.PlaneGeometry(8, 10, X_SEGS, Y_SEGS);

      return { material, geometry, xPos, yPos: 3, zPos, yRot };
    });
  }, []);

  useFrame((_state, delta) => {
    const isPlaying = useAudioStore.getState().isPlaying;
    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    if (hasAudio) {
      // Overall amplitude
      let sum = 0;
      for (let i = 0; i < normFreq.length; i++) sum += normFreq[i] * normFreq[i];
      const rms = Math.sqrt(sum / normFreq.length);
      smoothedAmp.current += (rms - smoothedAmp.current) * 0.12;

      // Beat detection for sudden billows
      const isBeat = detectBeat(normFreq, beatHistory.current, 1.3);
      if (isBeat) {
        beatBoost.current = 1.0;
      }
    } else {
      smoothedAmp.current += (0.08 - smoothedAmp.current) * 0.05;
    }

    // Decay beat boost
    beatBoost.current *= 0.93;

    const effectiveAmp = smoothedAmp.current + beatBoost.current * 0.5;

    for (const curtain of curtains) {
      curtain.material.uniforms.uTime.value += delta;
      curtain.material.uniforms.uAmplitude.value = effectiveAmp;
    }
  });

  return (
    <group>
      {curtains.map((curtain, i) => (
        <mesh
          key={i}
          geometry={curtain.geometry}
          material={curtain.material}
          position={[curtain.xPos, curtain.yPos, curtain.zPos]}
          rotation={[0, curtain.yRot, 0]}
        />
      ))}
    </group>
  );
}
