'use client';

import StudioCanvas from './StudioCanvas';
import { ChromesthesiaSurface } from './AudioSphere';
import AuroraRibbons from './AuroraRibbons';
import ParticleBurst from './ParticleBurst';

export default function StudioScene() {
  return (
    <StudioCanvas className="w-full h-full">
      <AuroraRibbons />
      <ChromesthesiaSurface />
      <ParticleBurst />
    </StudioCanvas>
  );
}
