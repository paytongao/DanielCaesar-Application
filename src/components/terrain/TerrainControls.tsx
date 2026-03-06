'use client';

interface TerrainControlsProps {
  version: 'released' | 'unreleased';
  onToggle: () => void;
}

export default function TerrainControls({ version, onToggle }: TerrainControlsProps) {
  const isReleased = version === 'released';

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
      {/* Version label */}
      <p className="text-xs tracking-[0.3em] uppercase text-white/40 font-light">
        {isReleased ? "Won't Live Here" : 'Temporary Lapse in Reasoning'}
      </p>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="group relative flex items-center gap-3 px-5 py-2.5 border border-white/10 rounded-full
                   hover:border-white/20 transition-all duration-500 bg-black/30 backdrop-blur-sm"
      >
        <span
          className={`text-xs tracking-widest uppercase transition-colors duration-500 ${
            isReleased ? 'text-purple-400' : 'text-white/30'
          }`}
        >
          Released
        </span>

        {/* Toggle track */}
        <div className="relative w-10 h-5 rounded-full bg-white/10 transition-colors duration-500">
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-500 ease-in-out ${
              isReleased
                ? 'left-0.5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                : 'left-[22px] bg-white/40'
            }`}
          />
        </div>

        <span
          className={`text-xs tracking-widest uppercase transition-colors duration-500 ${
            !isReleased ? 'text-white/60' : 'text-white/30'
          }`}
        >
          Unreleased
        </span>
      </button>
    </div>
  );
}
