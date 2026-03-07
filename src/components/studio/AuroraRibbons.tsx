'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import { fftBinToHz } from '@/lib/chromesthesia';

const SCRIABIN_HUES = [0, 20, 35, 50, 60, 120, 165, 180, 210, 240, 270, 290];

// Aurora curtain config
const CURTAIN_COUNT = 4;
const X_SEGS = 40; // segments along width (curtain drape)
const Y_SEGS = 60; // segments along height (vertical)

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

    // Multi-octave displacement along the curved normal direction
    float wave1 = sin(pos.y * 1.5 + uTime * 0.6 + uPhase) * 1.0;
    float wave2 = sin(pos.y * 3.0 + uTime * 1.0 + uPhase * 1.7) * 0.5;
    float wave3 = sin(uv.x * 8.0 + pos.y * 2.0 + uTime * 0.8 + uPhase * 0.5) * 0.4;
    float wave4 = sin(uv.x * 4.0 + uTime * 1.5 + uPhase * 2.3) * 0.3;

    float totalWave = (wave1 + wave2 + wave3 + wave4) * (0.4 + uAmplitude * 2.0);

    // Displace along the local normal (outward from curve center)
    float nx = sin(angle);
    float nz = cos(angle);
    pos.x += nx * totalWave * 0.5;
    pos.z += nz * totalWave * 0.5;

    // Additional vertical ripple — makes the curtain billow in 3D
    pos.z += sin(uv.x * 6.28 + pos.y * 2.5 + uTime * 0.7) * 0.6 * (0.3 + uAmplitude);
    pos.x += cos(pos.y * 1.8 + uTime * 0.5 + uPhase) * 0.3 * (0.2 + uAmplitude);

    vHeight = uv.y;
    vDisplacement = totalWave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const auroraFragmentShader = `
  uniform float uTime;
  uniform float uHue;
  uniform float uAmplitude;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vHeight;
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
    // Vertical curtain fade: bright at top, fades toward bottom
    float vertFade = smoothstep(0.0, 0.15, vHeight) * smoothstep(1.0, 0.5, vHeight);
    // Extra brightness at the top edge (aurora crown)
    float crown = smoothstep(0.7, 1.0, vHeight) * 1.5;

    // Horizontal fade at curtain edges
    float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);

    // Shimmer from displacement
    float shimmer = 0.6 + abs(vDisplacement) * 0.4;

    // Vertical streaks — aurora rays
    float streaks = abs(sin(vUv.x * 30.0 + vHeight * 2.0 + uTime * 0.3)) * 0.3;

    // Color: hue shifts along height for depth
    float hueShift = vHeight * 40.0 + sin(vUv.x * 4.0 + uTime * 0.2) * 15.0;
    float hue = mod(uHue + hueShift, 360.0);
    float sat = 0.6 + uAmplitude * 0.3;
    float lit = 0.15 + (shimmer + streaks + crown) * 0.25 + uAmplitude * 0.25;

    vec3 color = hsl2rgb(hue, sat, lit);

    // Emissive glow boost
    color *= 1.0 + crown * 0.5 + uAmplitude * 0.3;

    float alpha = edgeFade * vertFade * uOpacity * (0.25 + uAmplitude * 0.55);

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

  const curtains = useMemo(() => {
    return Array.from({ length: CURTAIN_COUNT }, (_, i) => {
      const phase = (i / CURTAIN_COUNT) * Math.PI * 2;
      // Spread curtains in a semicircle behind the surface
      const angle = ((i / (CURTAIN_COUNT - 1)) - 0.5) * Math.PI * 0.6;
      const dist = 5 + i * 1.2;
      const xPos = Math.sin(angle) * dist;
      const zPos = -Math.cos(angle) * dist;
      const yRot = -angle; // face inward

      // Different curvature per curtain for depth variation
      const curvature = 0.8 + i * 0.3;

      const material = new THREE.ShaderMaterial({
        vertexShader: auroraVertexShader,
        fragmentShader: auroraFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uHue: { value: 270 },
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
      const rawHue = detectDominantHue(normFreq);
      let diff = rawHue - smoothedHue.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      smoothedHue.current = ((smoothedHue.current + diff * 0.06) % 360 + 360) % 360;

      let totalEnergy = 0;
      for (let i = 0; i < normFreq.length; i++) totalEnergy += normFreq[i];
      const avgEnergy = totalEnergy / normFreq.length;
      smoothedAmp.current += (avgEnergy - smoothedAmp.current) * 0.1;
    } else {
      smoothedHue.current = (smoothedHue.current + delta * 6) % 360;
      smoothedAmp.current += (0.12 - smoothedAmp.current) * 0.05;
    }

    for (const curtain of curtains) {
      curtain.material.uniforms.uTime.value += delta;
      curtain.material.uniforms.uHue.value = smoothedHue.current;
      curtain.material.uniforms.uAmplitude.value = smoothedAmp.current;
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
