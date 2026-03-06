'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/atlas', label: 'Atlas' },
  { href: '/contrast', label: 'Contrast' },
  { href: '/terrain', label: 'Terrain' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="text-lg font-light tracking-widest text-white/80 hover:text-white transition-colors">
        CHROMESTHESIA
      </Link>

      <div className="flex gap-8">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm tracking-wider uppercase transition-colors ${
                isActive
                  ? 'text-purple-glow border-b border-purple-glow/50'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
