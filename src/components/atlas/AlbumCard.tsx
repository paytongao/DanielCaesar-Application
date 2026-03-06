'use client';

import Link from 'next/link';
import ColorPalette from './ColorPalette';

interface AlbumCardProps {
  slug: string;
  title: string;
  year: number;
  palette: string[];
  songCount: number;
}

export default function AlbumCard({ slug, title, year, palette, songCount }: AlbumCardProps) {
  const dominant = palette[0] ?? '#7C3AED';

  return (
    <Link
      href={`/atlas/${slug}`}
      className="group relative block rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] transition-all duration-500 hover:border-white/[0.12] hover:scale-[1.02]"
    >
      {/* Glow behind card */}
      <div
        className="absolute -inset-4 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl -z-10"
        style={{ background: `radial-gradient(circle, ${dominant}30 0%, transparent 70%)` }}
      />

      {/* Gradient cover placeholder */}
      <div
        className="h-44 w-full relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${palette[0]}CC, ${palette[1]}99, ${palette[2]}66, ${palette[3]}44)`,
        }}
      >
        {/* Subtle noise overlay */}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-3 right-3 text-white/30 text-xs font-mono tracking-wider">
          {year}
        </div>
      </div>

      {/* Info */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="text-base font-medium tracking-wide text-white/90 group-hover:text-white transition-colors">
            {title}
          </h3>
          <p className="mt-1 text-xs text-white/30 font-light">
            {songCount} track{songCount !== 1 ? 's' : ''} &middot; {year}
          </p>
        </div>

        <ColorPalette colors={palette} size="sm" />
      </div>
    </Link>
  );
}
