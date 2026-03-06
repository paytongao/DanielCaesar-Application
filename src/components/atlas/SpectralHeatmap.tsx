'use client';

import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface SpectralHeatmapProps {
  textureUrl?: string;
  size?: number;
  opacity?: number;
}

/**
 * Generates a procedural gradient texture as a fallback
 * when no heatmap PNG is available.
 */
function createProceduralTexture(width: number, height: number): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;

      // Warm-to-cool gradient with some procedural variation
      const wave = Math.sin(nx * Math.PI * 4) * 0.2 + Math.cos(ny * Math.PI * 6) * 0.15;
      const intensity = ny * 0.6 + wave + 0.2;

      // Map intensity to a purple-orange color ramp
      const r = Math.min(255, Math.max(0, Math.floor((intensity * 0.8 + 0.1) * 255)));
      const g = Math.min(255, Math.max(0, Math.floor((intensity * 0.3) * 255)));
      const b = Math.min(255, Math.max(0, Math.floor(((1 - intensity) * 0.7 + 0.3) * 255)));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

function HeatmapWithTexture({ textureUrl, size, opacity }: Required<SpectralHeatmapProps>) {
  const texture = useLoader(THREE.TextureLoader, textureUrl);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function HeatmapProcedural({ size, opacity }: { size: number; opacity: number }) {
  const texture = useMemo(() => createProceduralTexture(256, 256), []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function SpectralHeatmap({
  textureUrl,
  size = 6,
  opacity = 0.6,
}: SpectralHeatmapProps) {
  if (textureUrl) {
    return <HeatmapWithTexture textureUrl={textureUrl} size={size} opacity={opacity} />;
  }

  return <HeatmapProcedural size={size} opacity={opacity} />;
}
