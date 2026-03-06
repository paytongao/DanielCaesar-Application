'use client';

import AlbumCard from '@/components/atlas/AlbumCard';

const ALBUMS = [
  {
    slug: 'freudian',
    title: 'Freudian',
    year: 2017,
    palette: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9', '#DDD6FE'],
    songs: ['Get You', 'Best Part', 'Hold Me Down', 'Freudian', 'We Find Love', 'Blessed', 'Loose', 'Transform', 'Take Me Away'],
  },
  {
    slug: 'case-study-01',
    title: 'CASE STUDY 01',
    year: 2019,
    palette: ['#F59E0B', '#D97706', '#FBBF24', '#92400E', '#78716C', '#FDE68A'],
    songs: ['Entropy', 'Superposition', 'Open Up', 'Who Hurt You?', 'Love Again', 'Frontal Lobe Muzik', 'Too Deep to Turn Back', 'Cyanide', 'Are You OK?'],
  },
  {
    slug: 'never-enough',
    title: 'NEVER ENOUGH',
    year: 2023,
    palette: ['#EC4899', '#F472B6', '#BE185D', '#9D174D', '#FCA5A5', '#FECDD3'],
    songs: ['Do You Like Me', 'Toronto 2014', 'Ocho Rios', 'Let Me Go', 'Homiesexual', 'Cool', 'Vince Van Gogh', 'Pain Is Inevitable'],
  },
  {
    slug: 'son-of-spergy',
    title: 'Son of Spergy',
    year: 2025,
    palette: ['#10B981', '#34D399', '#059669', '#047857', '#6EE7B7', '#A7F3D0'],
    songs: ['Algorithmic Love', 'New Genesis', 'Fade Away'],
  },
];

export default function AtlasPage() {
  return (
    <div className="min-h-screen px-6 py-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-14 animate-fade-in">
        <h1 className="text-4xl sm:text-5xl font-extralight tracking-[0.15em] text-white/90">
          ATLAS
        </h1>
        <p className="mt-4 text-sm text-white/35 font-light max-w-xl leading-relaxed">
          Every album mapped to its chromesthetic palette. Each record carries a distinct
          spectral fingerprint — the colors I hear when Daniel Caesar sings.
        </p>
      </div>

      {/* Album grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-delay">
        {ALBUMS.map((album) => (
          <AlbumCard
            key={album.slug}
            slug={album.slug}
            title={album.title}
            year={album.year}
            palette={album.palette}
            songCount={album.songs.length}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-20 text-center animate-fade-in-delay-2">
        <p className="text-xs text-white/20 font-light tracking-wide">
          Palettes derived from spectral analysis of each album&apos;s harmonic content
        </p>
      </div>
    </div>
  );
}
