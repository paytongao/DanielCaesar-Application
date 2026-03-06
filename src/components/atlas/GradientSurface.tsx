'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { hexToRgb } from '@/components/shared/ColorUtils';

interface GradientSurfaceProps {
  data?: number[][];
  colors: string[];
  size?: number;
  segments?: number;
}

/**
 * Procedural noise generator for demo data when no real spectral data is available.
 */
function generateProceduralData(segments: number, seed: number = 42): number[][] {
  const data: number[][] = [];
  for (let i = 0; i <= segments; i++) {
    const row: number[] = [];
    for (let j = 0; j <= segments; j++) {
      const x = i / segments;
      const y = j / segments;
      const value =
        Math.sin(x * Math.PI * 2 + seed) * 0.3 +
        Math.cos(y * Math.PI * 3 + seed * 0.7) * 0.25 +
        Math.sin((x + y) * Math.PI * 4) * 0.15 +
        Math.cos(x * Math.PI * 5 - y * Math.PI * 2) * 0.1;
      row.push(value);
    }
    data.push(row);
  }
  return data;
}

export default function GradientSurface({
  data,
  colors,
  size = 6,
  segments = 64,
}: GradientSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const rgbColors = useMemo(() => colors.map(hexToRgb), [colors]);

  const heightData = useMemo(() => {
    if (data && data.length > 0) return data;
    return generateProceduralData(segments);
  }, [data, segments]);

  // Build the geometry with displaced vertices and palette-based vertex colors
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    const colorAttr = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const ix = i % (segments + 1);
      const iy = Math.floor(i / (segments + 1));

      // Map grid indices to data indices
      const dx = Math.min(ix, heightData[0].length - 1);
      const dy = Math.min(iy, heightData.length - 1);

      const height = heightData[dy][dx];
      positions.setY(i, height);

      // Color based on height — map to palette
      const t = (height + 1) / 2; // normalize roughly to [0,1]
      const colorIndex = Math.min(
        Math.floor(t * (rgbColors.length - 1)),
        rgbColors.length - 2
      );
      const localT = t * (rgbColors.length - 1) - colorIndex;

      const c1 = rgbColors[colorIndex];
      const c2 = rgbColors[colorIndex + 1];

      colorAttr[i * 3] = c1[0] + (c2[0] - c1[0]) * localT;
      colorAttr[i * 3 + 1] = c1[1] + (c2[1] - c1[1]) * localT;
      colorAttr[i * 3 + 2] = c1[2] + (c2[2] - c1[2]) * localT;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    geo.computeVertexNormals();

    return geo;
  }, [heightData, rgbColors, size, segments]);

  // Subtle breathing animation
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;

    const positions = meshRef.current.geometry.attributes.position;
    const baseData = heightData;

    for (let i = 0; i < positions.count; i++) {
      const ix = i % (segments + 1);
      const iy = Math.floor(i / (segments + 1));
      const dx = Math.min(ix, baseData[0].length - 1);
      const dy = Math.min(iy, baseData.length - 1);

      const base = baseData[dy][dx];
      const wave =
        Math.sin(timeRef.current * 0.6 + ix * 0.15) * 0.04 +
        Math.cos(timeRef.current * 0.4 + iy * 0.12) * 0.03;

      positions.setY(i, base + wave);
    }

    positions.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
}
