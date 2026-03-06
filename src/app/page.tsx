'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

const ChromesthesiaBlooms = dynamic(
  () => import('@/components/home/ChromesthesiaBlooms'),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden -mt-16 pt-16">
      {/* Chromesthesia firework blooms */}
      <ChromesthesiaBlooms />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-3xl">
        <h1 className="text-6xl sm:text-8xl font-extralight tracking-[0.2em] text-white/90 animate-fade-in">
          CHROMESTHESIA
        </h1>

        {/* Navigation cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fade-in-delay">
          <Link
            href="/atlas"
            className="group p-6 border border-white/10 rounded-lg hover:border-purple-glow/30 transition-all duration-500 hover:bg-white/[0.02]"
          >
            <h2 className="text-sm tracking-widest uppercase text-white/60 group-hover:text-purple-light transition-colors">
              Atlas
            </h2>
            <p className="mt-2 text-xs text-white/30 group-hover:text-white/50 transition-colors">
              Every album, mapped to its chromesthetic palette
            </p>
          </Link>

          <Link
            href="/contrast"
            className="group p-6 border border-white/10 rounded-lg hover:border-purple-glow/30 transition-all duration-500 hover:bg-white/[0.02]"
          >
            <h2 className="text-sm tracking-widest uppercase text-white/60 group-hover:text-purple-light transition-colors">
              Contrast
            </h2>
            <p className="mt-2 text-xs text-white/30 group-hover:text-white/50 transition-colors">
              Two versions. One purple. One grey.
            </p>
          </Link>

          <Link
            href="/terrain"
            className="group p-6 border border-white/10 rounded-lg hover:border-purple-glow/30 transition-all duration-500 hover:bg-white/[0.02]"
          >
            <h2 className="text-sm tracking-widest uppercase text-white/60 group-hover:text-purple-light transition-colors">
              Terrain
            </h2>
            <p className="mt-2 text-xs text-white/30 group-hover:text-white/50 transition-colors">
              Grey has no height
            </p>
          </Link>

          <Link
            href="/studio"
            className="group p-6 border border-white/10 rounded-lg hover:border-purple-glow/30 transition-all duration-500 hover:bg-white/[0.02]"
          >
            <h2 className="text-sm tracking-widest uppercase text-white/60 group-hover:text-purple-light transition-colors">
              Studio
            </h2>
            <p className="mt-2 text-xs text-white/30 group-hover:text-white/50 transition-colors">
              Upload your own. See what it sounds like.
            </p>
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
