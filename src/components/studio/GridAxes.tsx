'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

const GRID_SIZE = 8;
const GRID_DIVISIONS = 16;
const AXIS_LENGTH = 5.5;
const TICK_SIZE = 0.1;

/**
 * Desmos/Mathematica-style 3D grid with axes, gridlines, and tick marks.
 * Sits beneath/around the surface as a calculator-style reference frame.
 */
export default function GridAxes() {
  const gridLines = useMemo(() => {
    const positions: number[] = [];
    const half = GRID_SIZE / 2;
    const step = GRID_SIZE / GRID_DIVISIONS;

    // XZ plane grid lines
    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const pos = -half + i * step;
      // Lines along X
      positions.push(-half, 0, pos, half, 0, pos);
      // Lines along Z
      positions.push(pos, 0, -half, pos, 0, half);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  const axes = useMemo(() => {
    const positions: number[] = [];

    // X axis (red-ish)
    positions.push(-AXIS_LENGTH, 0, 0, AXIS_LENGTH, 0, 0);
    // Y axis (up)
    positions.push(0, 0, 0, 0, AXIS_LENGTH, 0);
    // Z axis
    positions.push(0, 0, -AXIS_LENGTH, 0, 0, AXIS_LENGTH);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  const ticks = useMemo(() => {
    const positions: number[] = [];
    const half = GRID_SIZE / 2;
    const step = GRID_SIZE / GRID_DIVISIONS;

    // X-axis ticks
    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const pos = -half + i * step;
      positions.push(pos, 0, -TICK_SIZE, pos, 0, TICK_SIZE);
    }

    // Z-axis ticks
    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const pos = -half + i * step;
      positions.push(-TICK_SIZE, 0, pos, TICK_SIZE, 0, pos);
    }

    // Y-axis ticks (vertical)
    for (let i = 1; i <= 8; i++) {
      const y = i * 0.5;
      positions.push(-TICK_SIZE, y, 0, TICK_SIZE, y, 0);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <group position={[0, -0.01, 0]}>
      {/* Grid plane */}
      <lineSegments geometry={gridLines}>
        <lineBasicMaterial color="#1a2a4a" transparent opacity={0.25} />
      </lineSegments>

      {/* Main axes */}
      <lineSegments geometry={axes}>
        <lineBasicMaterial color="#3060a0" transparent opacity={0.5} />
      </lineSegments>

      {/* Tick marks */}
      <lineSegments geometry={ticks}>
        <lineBasicMaterial color="#3060a0" transparent opacity={0.4} />
      </lineSegments>
    </group>
  );
}
