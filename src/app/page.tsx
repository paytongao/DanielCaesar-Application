import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient orb */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-purple-deep/20 blur-[120px] animate-pulse-glow" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-3xl">
        <h1 className="text-6xl sm:text-8xl font-extralight tracking-[0.2em] text-white/90 animate-fade-in">
          CHROMESTHESIA
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-white/40 font-light tracking-wide animate-fade-in-delay">
          I&apos;ve spent 24,000 minutes with somebody I&apos;ve never met.
        </p>

        <p className="mt-4 text-sm text-white/25 font-light max-w-lg mx-auto leading-relaxed animate-fade-in-delay-2">
          An interactive exploration of chromesthesia through the music of Daniel Caesar.
          See the colors I hear. Feel the difference between purple fireworks and flat grey.
        </p>

        {/* Navigation cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-delay-2">
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
