'use client';

import { useCallback } from 'react';
import SplitScreen from '@/components/contrast/SplitScreen';
import SpectralComparison from '@/components/contrast/SpectralComparison';
import AudioUpload from '@/components/audio/AudioUpload';
import { useAudioStore } from '@/stores/audioStore';

export default function ContrastPage() {
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const fileName = useAudioStore((s) => s.fileName);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

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
        <div className="mt-4 flex justify-center">
          <AudioUpload />
        </div>
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

      {/* Play button — centered at bottom of split screen */}
      <div className="flex justify-center py-6 animate-fade-in-delay-2">
        <button
          onClick={handlePlayPause}
          className="group relative"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {/* Outer glow ring */}
          <div
            className={`absolute inset-0 rounded-full transition-all duration-500 ${
              isPlaying
                ? 'scale-150 opacity-100'
                : 'scale-100 opacity-0'
            }`}
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
            }}
          />

          {/* Button */}
          <div
            className={`relative w-14 h-14 rounded-full border flex items-center justify-center transition-all duration-300 ${
              isPlaying
                ? 'border-purple-500/60 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                : 'border-white/20 bg-white/5 hover:border-purple-500/40 hover:bg-purple-500/5'
            }`}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <rect x="3" y="2" width="3.5" height="12" rx="0.5" />
                <rect x="9.5" y="2" width="3.5" height="12" rx="0.5" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white" className="ml-0.5">
                <polygon points="4,2 14,8 4,14" />
              </svg>
            )}
          </div>

          {/* Label */}
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest uppercase text-white/30 whitespace-nowrap">
            {isPlaying ? 'Pause' : fileName ? 'Play Both' : 'Upload Audio'}
          </span>
        </button>
      </div>

      {/* Spectral comparison below */}
      <div className="px-8 pb-12 animate-fade-in-delay-2">
        <SpectralComparison isPlaying={isPlaying} />
      </div>
    </div>
  );
}
