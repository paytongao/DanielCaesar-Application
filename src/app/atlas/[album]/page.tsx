'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Canvas3D from '@/components/shared/Canvas3D';
import GradientSurface from '@/components/atlas/GradientSurface';
import ColorPalette from '@/components/atlas/ColorPalette';

const ALBUMS: Record<string, {
  title: string;
  year: number;
  palette: string[];
  songs: string[];
}> = {
  freudian: {
    title: 'Freudian',
    year: 2017,
    palette: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9', '#DDD6FE'],
    songs: ['Get You', 'Best Part', 'Hold Me Down', 'Freudian', 'We Find Love', 'Blessed', 'Loose', 'Transform', 'Take Me Away'],
  },
  'case-study-01': {
    title: 'CASE STUDY 01',
    year: 2019,
    palette: ['#F59E0B', '#D97706', '#FBBF24', '#92400E', '#78716C', '#FDE68A'],
    songs: ['Entropy', 'Superposition', 'Open Up', 'Who Hurt You?', 'Love Again', 'Frontal Lobe Muzik', 'Too Deep to Turn Back', 'Cyanide', 'Are You OK?'],
  },
  'never-enough': {
    title: 'NEVER ENOUGH',
    year: 2023,
    palette: ['#EC4899', '#F472B6', '#BE185D', '#9D174D', '#FCA5A5', '#FECDD3'],
    songs: ['Do You Like Me', 'Toronto 2014', 'Ocho Rios', 'Let Me Go', 'Homiesexual', 'Cool', 'Vince Van Gogh', 'Pain Is Inevitable'],
  },
  'son-of-spergy': {
    title: 'Son of Spergy',
    year: 2025,
    palette: ['#10B981', '#34D399', '#059669', '#047857', '#6EE7B7', '#A7F3D0'],
    songs: ['Algorithmic Love', 'New Genesis', 'Fade Away'],
  },
};

export default function AlbumPage() {
  const params = useParams<{ album: string }>();
  const albumSlug = params.album;
  const album = ALBUMS[albumSlug];

  const [selectedSong, setSelectedSong] = useState<number>(0);

  // Generate a slightly different surface seed per song
  const surfaceData = useMemo(() => {
    if (!album) return undefined;
    const segments = 64;
    const seed = selectedSong * 7.3 + 1.5;
    const data: number[][] = [];
    for (let i = 0; i <= segments; i++) {
      const row: number[] = [];
      for (let j = 0; j <= segments; j++) {
        const x = i / segments;
        const y = j / segments;
        const value =
          Math.sin(x * Math.PI * 2 + seed) * 0.35 +
          Math.cos(y * Math.PI * 3 + seed * 0.7) * 0.25 +
          Math.sin((x + y) * Math.PI * 4 + seed * 0.3) * 0.15 +
          Math.cos(x * Math.PI * 5 - y * Math.PI * 2 + seed * 0.5) * 0.1;
        row.push(value);
      }
      data.push(row);
    }
    return data;
  }, [album, selectedSong]);

  if (!album) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/50 text-sm">Album not found.</p>
        <Link href="/atlas" className="text-purple-glow text-sm hover:underline">
          Back to Atlas
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 max-w-7xl mx-auto">
      {/* Back link + Album header */}
      <div className="mb-8 animate-fade-in">
        <Link
          href="/atlas"
          className="text-xs text-white/30 hover:text-white/60 transition-colors tracking-wider uppercase"
        >
          &larr; Atlas
        </Link>

        <div className="mt-4 flex items-end gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extralight tracking-[0.1em] text-white/90">
              {album.title}
            </h1>
            <p className="mt-1 text-sm text-white/30 font-light">
              {album.year} &middot; {album.songs.length} tracks
            </p>
          </div>
          <div className="ml-auto">
            <ColorPalette colors={album.palette} size="lg" />
          </div>
        </div>
      </div>

      {/* Main content: track list + 3D view */}
      <div className="flex flex-col lg:flex-row gap-6 animate-fade-in-delay">
        {/* Left panel: Track list */}
        <div className="lg:w-72 shrink-0">
          <h2 className="text-xs text-white/40 tracking-widest uppercase mb-3">
            Tracks
          </h2>
          <div className="space-y-1">
            {album.songs.map((song, i) => {
              const isActive = i === selectedSong;
              // Assign each song a color from the palette, cycling
              const dotColor = album.palette[i % album.palette.length];

              return (
                <button
                  key={i}
                  onClick={() => setSelectedSong(i)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-white/[0.06] text-white/90'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-300 ${
                      isActive ? 'scale-125' : 'scale-100'
                    }`}
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="text-sm font-light truncate">{song}</span>
                  <span className="ml-auto text-[10px] text-white/20 font-mono">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: 3D Visualization */}
        <div className="flex-1 min-h-[500px] lg:min-h-[600px] relative rounded-xl overflow-hidden border border-white/[0.06] bg-black/40">
          {/* Song title overlay */}
          <div className="absolute top-4 left-4 z-10">
            <p className="text-xs text-white/30 tracking-wider uppercase">Now viewing</p>
            <p className="text-sm text-white/70 font-light mt-0.5">
              {album.songs[selectedSong]}
            </p>
          </div>

          {/* Controls hint */}
          <div className="absolute bottom-4 right-4 z-10">
            <p className="text-[10px] text-white/20 font-mono">
              Drag to rotate &middot; Scroll to zoom
            </p>
          </div>

          <Canvas3D
            camera={{ position: [0, 4, 7], fov: 50 }}
            className="w-full h-full"
          >
            <GradientSurface
              data={surfaceData}
              colors={album.palette}
              size={6}
              segments={64}
            />
          </Canvas3D>
        </div>
      </div>
    </div>
  );
}
