'use client';

import { useRef, useEffect, useCallback } from 'react';
import { PURPLE_PALETTE, GREY_PALETTE } from '@/components/shared/ColorUtils';

interface SpectralComparisonProps {
  isPlaying: boolean;
  audioData?: Float32Array;
}

export default function SpectralComparison({ isPlaying, audioData }: SpectralComparisonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (isPlaying) {
      timeRef.current += 0.016;
    }
    const t = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const y = (h * 0.1) + (h * 0.8) * (i / 10);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 20; i++) {
      const x = w * (i / 20);
      ctx.beginPath();
      ctx.moveTo(x, h * 0.1);
      ctx.lineTo(x, h * 0.9);
      ctx.stroke();
    }

    // Labels
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.textAlign = 'left';
    ctx.fillText('FREQUENCY (Hz)', 10, h * 0.97);
    ctx.save();
    ctx.translate(12, h * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('AMPLITUDE', 0, 0);
    ctx.restore();

    const POINTS = 256;
    const baseY = h * 0.65;
    const maxAmp = h * 0.45;

    // Check if real audio data is available
    const hasAudio = audioData && audioData.length > 0 && audioData.some((v) => v > 0);

    // Generate purple curve (dynamic, alive)
    const generatePurpleCurve = (): number[] => {
      if (hasAudio) {
        // Map real FFT data to 256 points
        const pts: number[] = [];
        for (let i = 0; i < POINTS; i++) {
          const binIndex = Math.floor((i / POINTS) * audioData.length);
          pts.push(audioData[Math.min(binIndex, audioData.length - 1)]);
        }
        return pts;
      }

      const pts: number[] = [];
      for (let i = 0; i < POINTS; i++) {
        const nx = i / POINTS;
        // Frequency response with resonant peaks
        const bass = Math.exp(-nx * 8) * 0.6;
        const mid = Math.exp(-Math.pow(nx - 0.3, 2) * 40) * 0.5;
        const presence = Math.exp(-Math.pow(nx - 0.55, 2) * 60) * 0.35;
        const air = Math.exp(-Math.pow(nx - 0.8, 2) * 80) * 0.2;

        // Animated modulation
        const mod1 = Math.sin(t * 1.8 + nx * 15) * 0.08;
        const mod2 = Math.sin(t * 2.7 + nx * 10) * 0.06;
        const mod3 = Math.cos(t * 1.2 + nx * 25) * 0.04;
        const breathe = Math.sin(t * 0.5) * 0.05 + 0.05;

        const val = bass + mid + presence + air + mod1 + mod2 + mod3 + breathe;
        pts.push(Math.max(0.02, val));
      }
      return pts;
    };

    // Generate grey curve (flat, compressed)
    const generateGreyCurve = (): number[] => {
      if (hasAudio) {
        // Same FFT data but compressed to 10%
        const pts: number[] = [];
        for (let i = 0; i < POINTS; i++) {
          const binIndex = Math.floor((i / POINTS) * audioData.length);
          pts.push(audioData[Math.min(binIndex, audioData.length - 1)] * 0.1);
        }
        return pts;
      }

      const pts: number[] = [];
      for (let i = 0; i < POINTS; i++) {
        const nx = i / POINTS;
        const base = 0.12 - nx * 0.06;
        const mod = Math.sin(t * 0.6 + nx * 5) * 0.01;
        pts.push(Math.max(0.02, base + mod));
      }
      return pts;
    };

    const purplePts = generatePurpleCurve();
    const greyPts = generateGreyCurve();

    // Draw fill under purple curve
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let i = 0; i < POINTS; i++) {
      const x = (i / POINTS) * w;
      const y = baseY - purplePts[i] * maxAmp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, baseY);
    ctx.closePath();
    const purpleFill = ctx.createLinearGradient(0, baseY - maxAmp, 0, baseY);
    purpleFill.addColorStop(0, 'rgba(124, 58, 237, 0.15)');
    purpleFill.addColorStop(1, 'rgba(124, 58, 237, 0.02)');
    ctx.fillStyle = purpleFill;
    ctx.fill();

    // Draw purple curve
    ctx.beginPath();
    for (let i = 0; i < POINTS; i++) {
      const x = (i / POINTS) * w;
      const y = baseY - purplePts[i] * maxAmp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = PURPLE_PALETTE.glow;
    ctx.lineWidth = 2;
    ctx.shadowColor = PURPLE_PALETTE.glow;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw grey curve
    ctx.beginPath();
    for (let i = 0; i < POINTS; i++) {
      const x = (i / POINTS) * w;
      const y = baseY - greyPts[i] * maxAmp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = GREY_PALETTE.flat;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Legend
    const legendX = w - 220;
    const legendY = h * 0.12;

    ctx.fillStyle = PURPLE_PALETTE.glow;
    ctx.fillRect(legendX, legendY, 16, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText("Won't Live Here", legendX + 24, legendY + 4);

    ctx.fillStyle = GREY_PALETTE.flat;
    ctx.fillRect(legendX, legendY + 18, 16, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('Temporary Lapse', legendX + 24, legendY + 22);
  }, [isPlaying, audioData]);

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
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-xs tracking-[0.2em] uppercase font-mono text-white/40">
          Spectral Comparison
        </h3>
        <span className="text-[10px] font-mono text-white/20">
          Frequency Response Overlay
        </span>
      </div>
      <div className="relative border border-white/5 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ height: '240px' }}
        />
      </div>
    </div>
  );
}
