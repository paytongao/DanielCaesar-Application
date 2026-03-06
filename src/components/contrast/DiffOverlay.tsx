'use client';

import { useRef, useEffect, useCallback } from 'react';

interface DiffOverlayProps {
  visible: boolean;
  onToggle: () => void;
}

// Predefined difference regions (frequency ranges where versions diverge most)
const DIFF_REGIONS = [
  { start: 0.02, end: 0.12, intensity: 0.8, label: 'Bass' },
  { start: 0.22, end: 0.35, intensity: 0.6, label: 'Low-Mid' },
  { start: 0.48, end: 0.58, intensity: 0.9, label: 'Presence' },
  { start: 0.7, end: 0.78, intensity: 0.5, label: 'Air' },
  { start: 0.88, end: 0.95, intensity: 0.3, label: 'Brilliance' },
];

export default function DiffOverlay({ visible, onToggle }: DiffOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    timeRef.current += 0.016;
    const t = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    if (!visible) return;

    // Draw difference bands as vertical highlighted regions
    for (const region of DIFF_REGIONS) {
      const x = region.start * w;
      const rw = (region.end - region.start) * w;
      const pulse = Math.sin(t * 1.5 + region.start * 10) * 0.15 + 0.85;
      const alpha = region.intensity * 0.2 * pulse;

      // Colored band — gold/amber to indicate difference
      const grad = ctx.createLinearGradient(x, 0, x, h);
      grad.addColorStop(0, `rgba(245, 158, 11, ${alpha * 0.5})`);
      grad.addColorStop(0.5, `rgba(245, 158, 11, ${alpha})`);
      grad.addColorStop(1, `rgba(245, 158, 11, ${alpha * 0.5})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, rw, h);

      // Border lines
      ctx.strokeStyle = `rgba(245, 158, 11, ${alpha * 1.5})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + rw, 0);
      ctx.lineTo(x + rw, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = `rgba(245, 158, 11, ${Math.min(1, alpha * 3)})`;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(region.label, x + rw / 2, 14);

      // Intensity percentage
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.6, alpha * 2)})`;
      ctx.fillText(`${Math.round(region.intensity * 100)}%`, x + rw / 2, h - 6);
    }
  }, [visible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [draw]);

  return (
    <>
      {/* Overlay canvas — absolutely positioned over the split screen */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={`absolute top-4 right-4 z-30 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest transition-all duration-300 border ${
          visible
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
        }`}
      >
        {visible ? 'Hide Diff' : 'Show Diff'}
      </button>
    </>
  );
}
