'use client';

import SplitScreen from '@/components/contrast/SplitScreen';
import SpectralComparison from '@/components/contrast/SpectralComparison';
import { useAudioStore } from '@/stores/audioStore';

export default function ContrastPage() {
  const isPlaying = useAudioStore((s) => s.isPlaying);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="text-center pt-8 pb-4 px-4 animate-fade-in">
        <h1 className="text-xs tracking-[0.4em] uppercase font-mono text-white/30">
          Contrast Engine
        </h1>
        <p className="mt-2 text-lg font-light text-white/60">
          <span className="text-purple-400">Purple blooms.</span>
          {' '}
          <span className="text-neutral-500">Grey has no height.</span>
        </p>
      </div>

      {/* Split-screen visualizer */}
      <div className="flex-1 relative animate-fade-in-delay" style={{ minHeight: '60vh' }}>
        <SplitScreen
          leftVersion={{
            label: "Won't Live Here",
            theme: 'purple',
          }}
          rightVersion={{
            label: 'Temporary Lapse in Reasoning',
            theme: 'grey',
          }}
          isPlaying={isPlaying}
        />
      </div>

      {/* Spectral comparison below */}
      <div className="px-8 pb-12 animate-fade-in-delay-2">
        <SpectralComparison isPlaying={isPlaying} />
      </div>
    </div>
  );
}
