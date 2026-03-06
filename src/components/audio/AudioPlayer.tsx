'use client';

import { useAudioStore } from '@/stores/audioStore';

interface AudioPlayerProps {
  trackUrl?: string;
  label?: string;
  compact?: boolean;
}

export default function AudioPlayer({ trackUrl, label, compact = false }: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, currentTrack, loadTrack, play, pause, initAudio } = useAudioStore();

  const isCurrentTrack = currentTrack === trackUrl;

  const handlePlayPause = async () => {
    initAudio();

    if (!trackUrl) return;

    if (!isCurrentTrack) {
      await loadTrack(trackUrl);
      play();
    } else if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (compact) {
    return (
      <button
        onClick={handlePlayPause}
        className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-purple-glow/50 transition-colors"
        aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
      >
        {isCurrentTrack && isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
            <rect x="2" y="1" width="3.5" height="12" />
            <rect x="8.5" y="1" width="3.5" height="12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
            <polygon points="3,1 12,7 3,13" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
      <button
        onClick={handlePlayPause}
        className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-purple-glow/50 transition-colors flex-shrink-0"
        aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
      >
        {isCurrentTrack && isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
            <rect x="2" y="1" width="3.5" height="12" />
            <rect x="8.5" y="1" width="3.5" height="12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
            <polygon points="3,1 12,7 3,13" />
          </svg>
        )}
      </button>

      {label && <span className="text-sm text-white/70 min-w-0 truncate">{label}</span>}

      {isCurrentTrack && (
        <div className="flex items-center gap-2 text-xs text-white/50 ml-auto">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
}
