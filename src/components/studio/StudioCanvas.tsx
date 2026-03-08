'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ReactNode, Suspense } from 'react';

interface StudioCanvasProps {
  children: ReactNode;
  className?: string;
}

export default function StudioCanvas({
  children,
  className = 'w-full h-full',
}: StudioCanvasProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{
          position: [0, 5, 8] as [number, number, number],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true, alpha: true, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} color="#8090c0" />
          <directionalLight position={[5, 10, 5]} intensity={0.7} color="#90a8e0" />
          <pointLight position={[0, 8, 0]} intensity={0.6} color="#6088d0" />
          <pointLight position={[-4, 5, 4]} intensity={0.3} color="#7098e0" />

          {children}

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={3}
            maxDistance={25}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
