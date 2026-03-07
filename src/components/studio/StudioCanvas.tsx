'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
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
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 10, 5]} intensity={0.7} />
          <pointLight position={[0, 8, 0]} intensity={0.4} color="#a855f7" />

          {children}

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={3}
            maxDistance={25}
          />

          <EffectComposer>
            <Bloom
              intensity={0.8}
              luminanceThreshold={0.3}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
