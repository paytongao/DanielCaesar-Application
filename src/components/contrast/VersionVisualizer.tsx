'use client';

import { useRef, useEffect, useCallback } from 'react';
import { PURPLE_PALETTE, GREY_PALETTE } from '@/components/shared/ColorUtils';

interface VersionVisualizerProps {
  theme: 'purple' | 'grey';
  label: string;
  isPlaying: boolean;
  audioData?: Float32Array;
}

const BAR_COUNT = 48;
const SMOOTHING = 0.12;

export default function VersionVisualizer({ theme, label, isPlaying, audioData }: VersionVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const barsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const timeRef = useRef(0);
  const isPurple = theme === 'purple';

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const dt = 0.016;
    if (isPlaying) {
      timeRef.current += dt;
    }
    const t = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (isPurple) {
      bgGrad.addColorStop(0, 'rgba(45, 10, 78, 0.3)');
      bgGrad.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
    } else {
      bgGrad.addColorStop(0, 'rgba(26, 26, 26, 0.3)');
      bgGrad.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const barWidth = (w * 0.8) / BAR_COUNT;
    const gap = barWidth * 0.25;
    const startX = w * 0.1;
    const baseY = h * 0.85;
    const maxBarH = h * 0.65;

    // Check if real audio data is available (has signal)
    const hasAudio = audioData && audioData.length > 0 && audioData.some((v) => v > 0);

    // Generate target values
    for (let i = 0; i < BAR_COUNT; i++) {
      const freq = i / BAR_COUNT;
      let target: number;

      if (hasAudio) {
        // Map audioData bins to BAR_COUNT bars
        const binIndex = Math.floor((i / BAR_COUNT) * audioData.length);
        const binValue = audioData[Math.min(binIndex, audioData.length - 1)];

        if (isPurple) {
          // Full amplitude — dynamic, alive
          target = binValue;
        } else {
          // Compressed to 10% — flat, muted (the contrast metaphor)
          target = binValue * 0.1;
        }
      } else if (isPurple) {
        // Synthetic fallback: Energetic, dynamic — lots of harmonics and movement
        const wave1 = Math.sin(t * 2.3 + i * 0.35) * 0.3;
        const wave2 = Math.sin(t * 3.7 + i * 0.18) * 0.25;
        const wave3 = Math.cos(t * 1.1 + i * 0.55) * 0.2;
        const bass = i < 8 ? Math.sin(t * 1.8) * 0.3 + 0.4 : 0;
        const mid = (i > 10 && i < 30) ? Math.sin(t * 2.5 + i * 0.2) * 0.2 + 0.15 : 0;
        const high = i > 30 ? Math.sin(t * 4.2 + i * 0.4) * 0.15 : 0;
        const envelope = Math.sin(t * 0.4) * 0.15 + 0.5;
        target = Math.max(0.05, (wave1 + wave2 + wave3 + bass + mid + high) * envelope + 0.35);
        // Occasional spikes for energy
        if (Math.sin(t * 5.1 + i * 1.7) > 0.85) {
          target = Math.min(1, target + 0.3);
        }
      } else {
        // Synthetic fallback: Flat, muted, compressed — minimal movement
        const wave1 = Math.sin(t * 0.8 + i * 0.12) * 0.04;
        const wave2 = Math.sin(t * 1.2 + i * 0.08) * 0.03;
        const base = 0.12 - freq * 0.04;
        target = Math.max(0.03, base + wave1 + wave2);
        // Very subtle variation
        if (i < 6) target += 0.04;
      }

      // Smooth interpolation
      barsRef.current[i] += (target - barsRef.current[i]) * SMOOTHING;
    }

    // Draw bars
    for (let i = 0; i < BAR_COUNT; i++) {
      const barH = barsRef.current[i] * maxBarH;
      const x = startX + i * (barWidth + gap);
      const y = baseY - barH;

      if (isPurple) {
        // Gradient per bar: deep purple at base, glowing at top
        const grad = ctx.createLinearGradient(x, baseY, x, y);
        grad.addColorStop(0, PURPLE_PALETTE.deep);
        grad.addColorStop(0.4, PURPLE_PALETTE.mid);
        grad.addColorStop(0.8, PURPLE_PALETTE.glow);
        grad.addColorStop(1, PURPLE_PALETTE.light);
        ctx.fillStyle = grad;

        // Glow effect
        ctx.shadowColor = PURPLE_PALETTE.glow;
        ctx.shadowBlur = 8 + barsRef.current[i] * 16;
      } else {
        const grad = ctx.createLinearGradient(x, baseY, x, y);
        grad.addColorStop(0, GREY_PALETTE.dark);
        grad.addColorStop(0.5, GREY_PALETTE.muted);
        grad.addColorStop(1, GREY_PALETTE.flat);
        ctx.fillStyle = grad;

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Rounded top
      const radius = Math.min(barWidth * 0.4, 3);
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, baseY);
      ctx.closePath();
      ctx.fill();
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw waveform overlay (a continuous wave on top)
    if (isPurple) {
      ctx.beginPath();
      ctx.strokeStyle = `${PURPLE_PALETTE.light}66`;
      ctx.lineWidth = 1.5;
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        const y = baseY - maxBarH * 0.5
          + Math.sin(t * 2 + nx * 12) * maxBarH * 0.15
          + Math.sin(t * 3.3 + nx * 8) * maxBarH * 0.1
          + Math.cos(t * 1.5 + nx * 20) * maxBarH * 0.05;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.strokeStyle = `${GREY_PALETTE.light}33`;
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        const y = baseY - maxBarH * 0.12
          + Math.sin(t * 0.7 + nx * 6) * maxBarH * 0.02;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Particle effects for purple
    if (isPurple && isPlaying) {
      for (let i = 0; i < 20; i++) {
        const px = (Math.sin(t * 0.7 + i * 2.1) * 0.5 + 0.5) * w;
        const py = (Math.cos(t * 1.3 + i * 1.7) * 0.5 + 0.5) * h * 0.7;
        const size = Math.sin(t * 2 + i * 0.8) * 1.5 + 2;
        const alpha = Math.sin(t * 1.5 + i * 1.3) * 0.3 + 0.3;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${Math.max(0, alpha)})`;
        ctx.fill();
      }
    }
  }, [isPlaying, isPurple, audioData]);

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
    <div className="relative w-full h-full flex flex-col">
      {/* Label */}
      <div className="absolute top-4 left-0 right-0 z-10 text-center">
        <h3
          className={`text-xs tracking-[0.3em] uppercase font-mono ${
            isPurple ? 'text-purple-300/80' : 'text-neutral-500/80'
          }`}
        >
          {isPurple ? 'Released' : 'Unreleased'}
        </h3>
        <p
          className={`mt-1 text-sm font-medium ${
            isPurple ? 'text-purple-100' : 'text-neutral-400'
          }`}
        >
          {label}
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
