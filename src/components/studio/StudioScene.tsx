'use client';

import StudioCanvas from './StudioCanvas';
import { ChromesthesiaSurface } from './AudioSphere';
import AuroraRibbons from './AuroraRibbons';
import ParticleBurst from './ParticleBurst';
import GridAxes from './GridAxes';
import GlowOrbs from './GlowOrbs';

export default function StudioScene() {
  return (
    <StudioCanvas className="w-full h-full">
      <GlowOrbs />
      <GridAxes />
      <AuroraRibbons />
      <ChromesthesiaSurface />
      <ParticleBurst />
    </StudioCanvas>
  );
}
