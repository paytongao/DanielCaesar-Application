'use client';

import { useState } from 'react';
import VersionVisualizer from './VersionVisualizer';
import DiffOverlay from './DiffOverlay';

interface VersionConfig {
  label: string;
  theme: 'purple' | 'grey';
}

interface SplitScreenProps {
  leftVersion: VersionConfig;
  rightVersion: VersionConfig;
  isPlaying: boolean;
  audioData?: Float32Array;
}

export default function SplitScreen({ leftVersion, rightVersion, isPlaying, audioData }: SplitScreenProps) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div className="relative w-full h-full">
      {/* Split grid */}
      <div className="grid grid-cols-2 w-full h-full">
        {/* Left side — Purple (released) */}
        <div className="relative overflow-hidden">
          <VersionVisualizer
            theme={leftVersion.theme}
            label={leftVersion.label}
            isPlaying={isPlaying}
            audioData={audioData}
          />
        </div>

        {/* Right side — Grey (unreleased) */}
        <div className="relative overflow-hidden">
          <VersionVisualizer
            theme={rightVersion.theme}
            label={rightVersion.label}
            isPlaying={isPlaying}
            audioData={audioData}
          />
        </div>
      </div>

      {/* Center divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full z-10 pointer-events-none">
        {/* Gradient glow line */}
        <div
          className="w-full h-full"
          style={{
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              rgba(168, 85, 247, 0.1) 10%,
              rgba(168, 85, 247, 0.5) 30%,
              rgba(168, 85, 247, 0.8) 50%,
              rgba(168, 85, 247, 0.5) 70%,
              rgba(168, 85, 247, 0.1) 90%,
              transparent 100%
            )`,
            boxShadow: '0 0 12px 2px rgba(168, 85, 247, 0.3)',
          }}
        />
      </div>

      {/* Center diamond marker */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div
          className="w-3 h-3 rotate-45 border border-purple-400/60"
          style={{
            background: 'rgba(168, 85, 247, 0.2)',
            boxShadow: '0 0 16px 4px rgba(168, 85, 247, 0.25)',
          }}
        />
      </div>

      {/* Diff overlay */}
      <DiffOverlay
        visible={showDiff}
        onToggle={() => setShowDiff((v) => !v)}
      />
    </div>
  );
}
