'use client';

import dynamic from 'next/dynamic';
import AudioUpload from '@/components/audio/AudioUpload';

const AudioSphere = dynamic(
  () => import('@/components/studio/AudioSphere'),
  { ssr: false }
);

export default function StudioPage() {
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* 3D Sphere — full viewport */}
      <div className="absolute inset-0">
        <AudioSphere />
      </div>

      {/* Title */}
      <div className="absolute top-6 left-6 z-20">
        <h1 className="text-sm tracking-[0.3em] uppercase text-white/50 font-light">
          Studio
        </h1>
        <p className="mt-1 text-xs text-white/25 font-mono">
          Upload audio. See what it sounds like.
        </p>
      </div>

      {/* Audio upload — centered bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <AudioUpload />
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-8 right-6 z-20">
        <p className="text-[10px] text-white/20 font-mono">
          Drag to rotate &middot; Scroll to zoom
        </p>
      </div>
    </div>
  );
}
