'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import Canvas3D from '@/components/shared/Canvas3D';
import { useAudioStore } from '@/stores/audioStore';
import { useAudioAnalyser } from '@/components/audio/useAudioAnalyser';
import {
  smoothChromesthesiaColor,
  aggregateFrequencyBands,
  gaussianSmooth1D,
  laplacianSmoothY,
} from '@/lib/chromesthesia';

interface SpectralComparisonProps {
  isPlaying: boolean;
}

const FREQ_BINS = 128;
const TIME_ROWS = 32;
const VERTEX_COUNT = FREQ_BINS * TIME_ROWS;
const X_SPACING = 0.06;
const Z_SPACING = 0.12;
const GAUSSIAN_SIGMA = 4; // Smoothing width in bins
const TEMPORAL_SMOOTHING = 0.3; // Exponential moving average factor
const LAPLACIAN_ITERATIONS = 3; // Mesh smoothing passes
const HEIGHT_SCALE = 3.5;

function buildIndices(): Uint32Array {
  const indices: number[] = [];
  for (let row = 0; row < TIME_ROWS - 1; row++) {
    for (let col = 0; col < FREQ_BINS - 1; col++) {
      const a = row * FREQ_BINS + col;
      const b = a + 1;
      const c = (row + 1) * FREQ_BINS + col;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  return new Uint32Array(indices);
}

function FrequencySurface3D() {
  const purpleMeshRef = useRef<THREE.Mesh>(null);
  const greyMeshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const analyser = useAudioAnalyser();

  // Ring buffers for FFT history (already smoothed)
  const purpleHistoryRef = useRef(new Float32Array(FREQ_BINS * TIME_ROWS));
  const greyHistoryRef = useRef(new Float32Array(FREQ_BINS * TIME_ROWS));

  // Previous frame for temporal smoothing
  const prevPurpleRef = useRef(new Float32Array(FREQ_BINS));
  const prevGreyRef = useRef(new Float32Array(FREQ_BINS));

  const indices = useMemo(() => buildIndices(), []);

  // Create geometries
  const purpleGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(VERTEX_COUNT * 3);
    const colors = new Float32Array(VERTEX_COUNT * 3);

    for (let row = 0; row < TIME_ROWS; row++) {
      for (let col = 0; col < FREQ_BINS; col++) {
        const idx = (row * FREQ_BINS + col) * 3;
        positions[idx] = (col - FREQ_BINS / 2) * X_SPACING;
        positions[idx + 1] = 0;
        positions[idx + 2] = row * Z_SPACING;
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    geom.computeVertexNormals();
    return geom;
  }, [indices]);

  const greyGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(VERTEX_COUNT * 3);
    const colors = new Float32Array(VERTEX_COUNT * 3);

    for (let row = 0; row < TIME_ROWS; row++) {
      for (let col = 0; col < FREQ_BINS; col++) {
        const idx = (row * FREQ_BINS + col) * 3;
        positions[idx] = (col - FREQ_BINS / 2) * X_SPACING;
        positions[idx + 1] = 0;
        positions[idx + 2] = row * Z_SPACING + 0.5;
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    geom.computeVertexNormals();
    return geom;
  }, [indices]);

  // Grid lines geometry
  const gridGeom = useMemo(() => {
    const points: number[] = [];
    const xMin = -FREQ_BINS / 2 * X_SPACING;
    const xMax = FREQ_BINS / 2 * X_SPACING;
    const zMin = 0;
    const zMax = TIME_ROWS * Z_SPACING;

    for (let row = 0; row <= TIME_ROWS; row += 4) {
      const z = row * Z_SPACING;
      points.push(xMin, -0.01, z, xMax, -0.01, z);
    }
    for (let col = 0; col <= FREQ_BINS; col += 16) {
      const x = (col - FREQ_BINS / 2) * X_SPACING;
      points.push(x, -0.01, zMin, x, -0.01, zMax);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geom;
  }, []);

  useFrame((_state, delta) => {
    const isPlaying = useAudioStore.getState().isPlaying;

    if (isPlaying) {
      timeRef.current += delta;
      analyser.update();
    }
    const t = timeRef.current;

    const normFreq = analyser.normalizedFrequency;
    const hasAudio = isPlaying && normFreq.length > 0 && normFreq.some((v: number) => v > 0);

    // Get current FFT bands
    let purpleBands: number[];
    let greyBands: number[];

    if (hasAudio) {
      const rawBands = aggregateFrequencyBands(normFreq, FREQ_BINS);
      // Gaussian spatial smoothing — eliminates jagged bin-to-bin noise
      purpleBands = gaussianSmooth1D(rawBands, GAUSSIAN_SIGMA);
      greyBands = purpleBands.map((v) => v * 0.1);
    } else {
      // Synthetic data — already smooth by construction
      purpleBands = [];
      greyBands = [];
      for (let i = 0; i < FREQ_BINS; i++) {
        const nx = i / FREQ_BINS;
        const bass = Math.exp(-nx * 8) * 0.6;
        const mid = Math.exp(-Math.pow(nx - 0.3, 2) * 40) * 0.5;
        const presence = Math.exp(-Math.pow(nx - 0.55, 2) * 60) * 0.35;
        const air = Math.exp(-Math.pow(nx - 0.8, 2) * 80) * 0.2;
        const mod1 = Math.sin(t * 1.8 + nx * 15) * 0.08;
        const mod2 = Math.sin(t * 2.7 + nx * 10) * 0.06;
        const breathe = Math.sin(t * 0.5) * 0.05 + 0.05;
        purpleBands.push(Math.max(0.02, bass + mid + presence + air + mod1 + mod2 + breathe));

        const gBase = 0.12 - nx * 0.06;
        const gMod = Math.sin(t * 0.6 + nx * 5) * 0.01;
        greyBands.push(Math.max(0.02, gBase + gMod));
      }
    }

    // Temporal smoothing — exponential moving average between frames
    const prevP = prevPurpleRef.current;
    const prevG = prevGreyRef.current;
    for (let i = 0; i < FREQ_BINS; i++) {
      purpleBands[i] = prevP[i] + (purpleBands[i] - prevP[i]) * TEMPORAL_SMOOTHING;
      greyBands[i] = prevG[i] + (greyBands[i] - prevG[i]) * TEMPORAL_SMOOTHING;
      prevP[i] = purpleBands[i];
      prevG[i] = greyBands[i];
    }

    // Shift history rows back (row N-1 is oldest, row 0 is newest)
    const pHist = purpleHistoryRef.current;
    const gHist = greyHistoryRef.current;
    pHist.copyWithin(FREQ_BINS, 0, FREQ_BINS * (TIME_ROWS - 1));
    gHist.copyWithin(FREQ_BINS, 0, FREQ_BINS * (TIME_ROWS - 1));
    for (let i = 0; i < FREQ_BINS; i++) {
      pHist[i] = purpleBands[i];
      gHist[i] = greyBands[i];
    }

    // Update purple geometry — set Y from history
    const pPos = purpleGeom.getAttribute('position') as THREE.BufferAttribute;
    const pCol = purpleGeom.getAttribute('color') as THREE.BufferAttribute;
    const pPosArr = pPos.array as Float32Array;
    const pColArr = pCol.array as Float32Array;

    for (let row = 0; row < TIME_ROWS; row++) {
      for (let col = 0; col < FREQ_BINS; col++) {
        const vi = row * FREQ_BINS + col;
        const amplitude = pHist[row * FREQ_BINS + col];
        pPosArr[vi * 3 + 1] = amplitude * HEIGHT_SCALE;
      }
    }

    // Laplacian mesh smoothing — averages each vertex Y with neighbors
    laplacianSmoothY(pPosArr, FREQ_BINS, TIME_ROWS, LAPLACIAN_ITERATIONS);

    // Apply colors using smooth Catmull-Rom chromesthesia
    for (let row = 0; row < TIME_ROWS; row++) {
      for (let col = 0; col < FREQ_BINS; col++) {
        const vi = row * FREQ_BINS + col;
        const amplitude = pPosArr[vi * 3 + 1] / HEIGHT_SCALE; // read back smoothed amplitude
        const freqNorm = col / FREQ_BINS;
        const [r, g, b] = smoothChromesthesiaColor(freqNorm, Math.min(1, amplitude));
        pColArr[vi * 3] = r;
        pColArr[vi * 3 + 1] = g;
        pColArr[vi * 3 + 2] = b;
      }
    }
    pPos.needsUpdate = true;
    pCol.needsUpdate = true;
    purpleGeom.computeVertexNormals();

    // Update grey geometry
    const gPos = greyGeom.getAttribute('position') as THREE.BufferAttribute;
    const gCol = greyGeom.getAttribute('color') as THREE.BufferAttribute;
    const gPosArr = gPos.array as Float32Array;
    const gColArr = gCol.array as Float32Array;

    for (let row = 0; row < TIME_ROWS; row++) {
      for (let col = 0; col < FREQ_BINS; col++) {
        const vi = row * FREQ_BINS + col;
        const amplitude = gHist[row * FREQ_BINS + col];
        gPosArr[vi * 3 + 1] = amplitude * HEIGHT_SCALE;
      }
    }

    // Laplacian smoothing on grey surface too
    laplacianSmoothY(gPosArr, FREQ_BINS, TIME_ROWS, LAPLACIAN_ITERATIONS);

    for (let row = 0; row < TIME_ROWS; row++) {
      for (let col = 0; col < FREQ_BINS; col++) {
        const vi = row * FREQ_BINS + col;
        const amp = gPosArr[vi * 3 + 1] / HEIGHT_SCALE;
        const grey = 0.25 + amp * 0.2;
        gColArr[vi * 3] = grey;
        gColArr[vi * 3 + 1] = grey;
        gColArr[vi * 3 + 2] = grey;
      }
    }
    gPos.needsUpdate = true;
    gCol.needsUpdate = true;
    greyGeom.computeVertexNormals();
  });

  return (
    <>
      {/* Grid lines */}
      <lineSegments geometry={gridGeom}>
        <lineBasicMaterial color={0xffffff} opacity={0.05} transparent />
      </lineSegments>

      {/* Purple surface */}
      <mesh ref={purpleMeshRef} geometry={purpleGeom}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          roughness={0.5}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>

      {/* Grey surface */}
      <mesh ref={greyMeshRef} geometry={greyGeom}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>
    </>
  );
}

export default function SpectralComparison({ isPlaying }: SpectralComparisonProps) {
  void isPlaying; // managed internally via store

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-xs tracking-[0.2em] uppercase font-mono text-white/40">
          Spectral Comparison
        </h3>
        <span className="text-[10px] font-mono text-white/20">
          Frequency Response Overlay
        </span>
      </div>
      <div className="relative border border-white/5 rounded-lg overflow-hidden" style={{ height: '300px' }}>
        <Canvas3D
          camera={{ position: [0, 4, 6], fov: 50 }}
          className="w-full h-full"
        >
          <FrequencySurface3D />
        </Canvas3D>

        {/* Legend overlay */}
        <div className="absolute top-3 right-4 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-0.5 bg-purple-500" />
            <span className="text-[10px] font-mono text-white/50">Won&apos;t Live Here</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-neutral-500" />
            <span className="text-[10px] font-mono text-white/35">Temporary Lapse</span>
          </div>
        </div>
      </div>
    </div>
  );
}
