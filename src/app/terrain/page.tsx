'use client';

import { useState } from 'react';
import TerrainScene from '@/components/terrain/TerrainScene';
import TerrainControls from '@/components/terrain/TerrainControls';
import Link from 'next/link';

export default function TerrainPage() {
  const [version, setVersion] = useState<'released' | 'unreleased'>('released');

  const toggle = () =>
    setVersion((v) => (v === 'released' ? 'unreleased' : 'released'));

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* 3D Scene — full viewport */}
      <div className="absolute inset-0">
        <TerrainScene version={version} />
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 text-xs tracking-[0.25em] uppercase text-white/30 hover:text-white/60 transition-colors duration-300"
      >
        Chromesthesia
      </Link>

      {/* Section title */}
      <div className="absolute top-6 right-6 z-20 text-right">
        <h1 className="text-sm tracking-[0.3em] uppercase text-white/50 font-light">
          Terrain
        </h1>
      </div>

      {/* "Grey has no height" overlay — fades in only for unreleased */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none
                    transition-all duration-1000 ease-in-out ${
                      version === 'unreleased'
                        ? 'opacity-100 translate-y-[-50%]'
                        : 'opacity-0 translate-y-[-45%]'
                    }`}
      >
        <p className="text-2xl sm:text-4xl font-extralight tracking-[0.2em] text-white/30 whitespace-nowrap select-none">
          Grey has no height
        </p>
      </div>

      {/* Controls */}
      <TerrainControls version={version} onToggle={toggle} />
    </div>
  );
}
