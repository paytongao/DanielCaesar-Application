'use client';

import { useCallback, useRef, useState } from 'react';
import { useAudioStore } from '@/stores/audioStore';

const ACCEPT = '.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm';

export default function AudioUpload() {
  const { isPlaying, fileName, loadFile, play, pause } = useAudioStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        await loadFile(file);
      } finally {
        setIsLoading(false);
      }
    },
    [loadFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex items-center gap-3">
      {/* Drop zone / file picker */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-purple-500/60 bg-purple-500/10'
            : fileName
            ? 'border-white/10 bg-white/[0.03]'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onFileChange}
          className="hidden"
        />

        {isLoading ? (
          <span className="text-xs text-white/40 font-mono">Loading...</span>
        ) : fileName ? (
          <span className="text-xs text-white/60 font-mono truncate max-w-[180px]">
            {fileName}
          </span>
        ) : (
          <span className="text-xs text-white/30 font-mono">
            Drop audio or click to upload
          </span>
        )}
      </div>

      {/* Play/Pause button — only show when a file is loaded */}
      {fileName && !isLoading && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isPlaying) { pause(); } else { play(); }
          }}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 ${
            isPlaying
              ? 'border-purple-500/60 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'border-white/20 bg-white/5 hover:border-purple-500/40'
          }`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <rect x="1" y="1" width="2.5" height="8" rx="0.5" />
              <rect x="6.5" y="1" width="2.5" height="8" rx="0.5" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white" className="ml-0.5">
              <polygon points="2,1 9,5 2,9" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
