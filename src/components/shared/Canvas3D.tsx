'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ReactNode, Suspense } from 'react';

interface Canvas3DProps {
  children: ReactNode;
  camera?: {
    position?: [number, number, number];
    fov?: number;
  };
  controls?: boolean;
  className?: string;
}

export default function Canvas3D({
  children,
  camera = { position: [0, 5, 8], fov: 50 },
  controls = true,
  className = 'w-full h-full',
}: Canvas3DProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{
          position: camera.position,
          fov: camera.fov,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 10, 5]} intensity={0.8} />
          {children}
          {controls && (
            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2.2}
              minDistance={3}
              maxDistance={20}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
