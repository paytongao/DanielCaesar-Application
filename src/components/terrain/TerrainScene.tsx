'use client';

import Canvas3D from '@/components/shared/Canvas3D';
import AudioTerrain from './AudioTerrain';

interface TerrainSceneProps {
  version: 'released' | 'unreleased';
}

export default function TerrainScene({ version }: TerrainSceneProps) {
  return (
    <Canvas3D
      camera={{ position: [0, 6, 9], fov: 45 }}
      controls={true}
      className="w-full h-full"
    >
      <fog attach="fog" args={['#000000', 8, 22]} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 8, 4]} intensity={0.6} color="#d8b4fe" />
      <directionalLight position={[-4, 6, -3]} intensity={0.3} color="#7c3aed" />
      <AudioTerrain version={version} />
    </Canvas3D>
  );
}
