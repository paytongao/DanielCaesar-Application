'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

const GRID_SIZE = 8;
const GRID_DIVISIONS = 8;
const AXIS_LENGTH = 5.5;
const TICK_SIZE = 0.12;

// Axis number labels
const LABEL_VALUES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const Y_LABEL_VALUES = [0, 1, 2, 3, 4];

/**
 * Desmos/Mathematica-style 3D grid with axes, gridlines, tick marks,
 * and numeric labels on each axis.
 */
export default function GridAxes() {
  const gridLines = useMemo(() => {
    const positions: number[] = [];
    const half = GRID_SIZE / 2;
    const step = GRID_SIZE / GRID_DIVISIONS;

    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const pos = -half + i * step;
      positions.push(-half, 0, pos, half, 0, pos);
      positions.push(pos, 0, -half, pos, 0, half);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  const axes = useMemo(() => {
    const positions: number[] = [];
    // X axis
    positions.push(-AXIS_LENGTH, 0, 0, AXIS_LENGTH, 0, 0);
    // Y axis (up)
    positions.push(0, -0.5, 0, 0, AXIS_LENGTH, 0);
    // Z axis
    positions.push(0, 0, -AXIS_LENGTH, 0, 0, AXIS_LENGTH);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  const ticks = useMemo(() => {
    const positions: number[] = [];

    // X-axis ticks
    for (const v of LABEL_VALUES) {
      positions.push(v, 0, -TICK_SIZE, v, 0, TICK_SIZE);
    }
    // Z-axis ticks
    for (const v of LABEL_VALUES) {
      positions.push(-TICK_SIZE, 0, v, TICK_SIZE, 0, v);
    }
    // Y-axis ticks
    for (const v of Y_LABEL_VALUES) {
      if (v === 0) continue;
      positions.push(-TICK_SIZE, v, 0, TICK_SIZE, v, 0);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <group position={[0, -0.01, 0]}>
      {/* Grid plane */}
      <lineSegments geometry={gridLines}>
        <lineBasicMaterial color="#1a2a4a" transparent opacity={0.3} />
      </lineSegments>

      {/* Main axes */}
      <lineSegments geometry={axes}>
        <lineBasicMaterial color="#4070b0" transparent opacity={0.6} />
      </lineSegments>

      {/* Tick marks */}
      <lineSegments geometry={ticks}>
        <lineBasicMaterial color="#4070b0" transparent opacity={0.5} />
      </lineSegments>

      {/* X-axis labels */}
      {LABEL_VALUES.filter(v => v !== 0).map((v) => (
        <Text
          key={`x-${v}`}
          position={[v, 0, -0.4]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.2}
          color="#4080c0"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.6}
        >
          {v}
        </Text>
      ))}

      {/* Z-axis labels */}
      {LABEL_VALUES.filter(v => v !== 0).map((v) => (
        <Text
          key={`z-${v}`}
          position={[-0.4, 0, v]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.2}
          color="#4080c0"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.6}
        >
          {v}
        </Text>
      ))}

      {/* Y-axis labels */}
      {Y_LABEL_VALUES.filter(v => v !== 0).map((v) => (
        <Text
          key={`y-${v}`}
          position={[-0.3, v, 0]}
          fontSize={0.2}
          color="#4080c0"
          anchorX="right"
          anchorY="middle"
          fillOpacity={0.6}
        >
          {v}
        </Text>
      ))}

      {/* Axis labels */}
      <Text
        position={[AXIS_LENGTH + 0.3, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25}
        color="#5090d0"
        anchorX="center"
        fillOpacity={0.7}
      >
        x
      </Text>
      <Text
        position={[0, AXIS_LENGTH + 0.3, 0]}
        fontSize={0.25}
        color="#5090d0"
        anchorX="center"
        fillOpacity={0.7}
      >
        y
      </Text>
      <Text
        position={[0, 0, AXIS_LENGTH + 0.3]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25}
        color="#5090d0"
        anchorX="center"
        fillOpacity={0.7}
      >
        z
      </Text>
    </group>
  );
}
