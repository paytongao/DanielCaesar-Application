'use client';

interface ColorPaletteProps {
  colors: string[];
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-6 h-6',
};

export default function ColorPalette({ colors, size = 'md' }: ColorPaletteProps) {
  const dotSize = sizeMap[size];

  return (
    <div className="flex items-center gap-1.5">
      {colors.map((color, i) => (
        <div
          key={i}
          className={`${dotSize} rounded-full ring-1 ring-white/10`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
