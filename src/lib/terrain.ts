import * as THREE from 'three';
import { HeightmapData } from '@/types/terrain';

export function createTerrainGeometry(
  heightmap: HeightmapData,
  maxElevation: number = 3,
  size: number = 10
): THREE.PlaneGeometry {
  const { grid, rows, cols } = heightmap;
  const geometry = new THREE.PlaneGeometry(size, size, cols - 1, rows - 1);
  const positions = geometry.attributes.position.array as Float32Array;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      // Z axis is height in PlaneGeometry (before rotation)
      positions[index * 3 + 2] = (grid[row]?.[col] ?? 0) * maxElevation;
    }
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function interpolateHeightmaps(
  from: HeightmapData,
  to: HeightmapData,
  t: number
): number[][] {
  const rows = Math.min(from.rows, to.rows);
  const cols = Math.min(from.cols, to.cols);
  const result: number[][] = [];

  for (let r = 0; r < rows; r++) {
    result[r] = [];
    for (let c = 0; c < cols; c++) {
      const a = from.grid[r]?.[c] ?? 0;
      const b = to.grid[r]?.[c] ?? 0;
      result[r][c] = a + (b - a) * t;
    }
  }

  return result;
}
