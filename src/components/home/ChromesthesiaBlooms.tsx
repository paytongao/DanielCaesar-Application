'use client';

import { useRef, useEffect, useCallback } from 'react';

// Scriabin-inspired chromesthesia palette — muted, luminous tones
const BLOOM_COLORS = [
  { r: 139, g: 92, b: 246 },   // violet (B)
  { r: 236, g: 72, b: 153 },   // rose-pink (A#)
  { r: 59, g: 130, b: 246 },   // sky blue (G#)
  { r: 245, g: 158, b: 11 },   // amber (D)
  { r: 16, g: 185, b: 129 },   // emerald (F)
  { r: 168, g: 85, b: 247 },   // purple (B)
  { r: 251, g: 191, b: 36 },   // golden (E)
  { r: 14, g: 165, b: 233 },   // cyan (G)
  { r: 244, g: 114, b: 182 },  // soft pink (A#)
  { r: 52, g: 211, b: 153 },   // mint (F#)
  { r: 192, g: 132, b: 252 },  // lavender
  { r: 251, g: 146, b: 60 },   // tangerine (D#)
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: typeof BLOOM_COLORS[0];
  size: number;
  decay: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface Bloom {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: typeof BLOOM_COLORS[0];
  secondaryColor: typeof BLOOM_COLORS[0];
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  phase: 'rising' | 'exploding' | 'fading';
  particles: Particle[];
  driftX: number;
  driftY: number;
  burstCount: number;
  rings: number;
  rotationSpeed: number;
  rotation: number;
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function pickColor() {
  return BLOOM_COLORS[Math.floor(Math.random() * BLOOM_COLORS.length)];
}

function createBloom(w: number, h: number): Bloom {
  const x = randomBetween(w * 0.1, w * 0.9);
  const startY = h + 20;
  const targetY = randomBetween(h * 0.15, h * 0.6);
  const color = pickColor();
  let secondary = pickColor();
  while (secondary === color) secondary = pickColor();

  return {
    x,
    y: startY,
    targetX: x + randomBetween(-80, 80),
    targetY,
    color,
    secondaryColor: secondary,
    radius: 0,
    maxRadius: randomBetween(60, 160),
    life: 0,
    maxLife: randomBetween(3.5, 6),
    phase: 'rising',
    particles: [],
    driftX: randomBetween(-8, 8),
    driftY: randomBetween(-4, 2),
    burstCount: Math.floor(randomBetween(40, 90)),
    rings: Math.floor(randomBetween(1, 3)),
    rotationSpeed: randomBetween(-0.3, 0.3),
    rotation: 0,
  };
}

function explodeBloom(bloom: Bloom) {
  const particles: Particle[] = [];

  for (let ring = 0; ring < bloom.rings; ring++) {
    const ringScale = 0.5 + (ring / bloom.rings) * 0.5;
    const count = Math.floor(bloom.burstCount * ringScale);
    const useColor = ring % 2 === 0 ? bloom.color : bloom.secondaryColor;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + randomBetween(-0.15, 0.15);
      const speed = randomBetween(0.4, 2.5) * ringScale * (bloom.maxRadius / 100);
      const sizeBase = randomBetween(1, 3.5);

      particles.push({
        x: bloom.x,
        y: bloom.y,
        vx: Math.cos(angle) * speed + randomBetween(-0.2, 0.2),
        vy: Math.sin(angle) * speed + randomBetween(-0.2, 0.2),
        life: 0,
        maxLife: randomBetween(1.8, 3.5),
        color: useColor,
        size: sizeBase,
        decay: randomBetween(0.92, 0.98),
        trail: [],
      });
    }
  }

  // Add a few special "streamer" particles that arc gracefully
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const speed = randomBetween(2.5, 4);
    particles.push({
      x: bloom.x,
      y: bloom.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      life: 0,
      maxLife: randomBetween(2, 3),
      color: bloom.secondaryColor,
      size: 2,
      decay: 0.96,
      trail: [],
    });
  }

  bloom.particles = particles;
}

export default function ChromesthesiaBlooms() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bloomsRef = useRef<Bloom[]>([]);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Delta time
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    // Fade the previous frame — creates the trailing glow
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10, 10, 10, 0.12)';
    ctx.fillRect(0, 0, w, h);

    // Spawn new blooms
    spawnTimerRef.current -= dt;
    if (spawnTimerRef.current <= 0) {
      bloomsRef.current.push(createBloom(w, h));
      spawnTimerRef.current = randomBetween(0.6, 1.8);
    }

    // Update & draw blooms
    ctx.globalCompositeOperation = 'lighter';

    const blooms = bloomsRef.current;
    for (let b = blooms.length - 1; b >= 0; b--) {
      const bloom = blooms[b];
      bloom.life += dt;
      bloom.rotation += bloom.rotationSpeed * dt;

      if (bloom.phase === 'rising') {
        // Rising phase — a small glowing dot ascending
        const riseProgress = Math.min(bloom.life / 0.8, 1);
        const ease = 1 - Math.pow(1 - riseProgress, 3);
        bloom.x = bloom.x + (bloom.targetX - bloom.x) * 0.02;
        bloom.y = bloom.y + (bloom.targetY - bloom.y) * (0.03 + ease * 0.04);

        // Draw the rising trail
        const trailAlpha = 0.3 * (1 - riseProgress * 0.5);
        const gradient = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, 6);
        gradient.addColorStop(0, `rgba(${bloom.color.r}, ${bloom.color.g}, ${bloom.color.b}, ${trailAlpha})`);
        gradient.addColorStop(1, `rgba(${bloom.color.r}, ${bloom.color.g}, ${bloom.color.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bloom.x, bloom.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Transition to exploding
        if (Math.abs(bloom.y - bloom.targetY) < 15 || bloom.life > 1.2) {
          bloom.phase = 'exploding';
          bloom.life = 0;
          explodeBloom(bloom);

          // Initial flash
          const flashGrad = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, bloom.maxRadius * 0.3);
          flashGrad.addColorStop(0, `rgba(${bloom.color.r}, ${bloom.color.g}, ${bloom.color.b}, 0.15)`);
          flashGrad.addColorStop(0.5, `rgba(${bloom.color.r}, ${bloom.color.g}, ${bloom.color.b}, 0.06)`);
          flashGrad.addColorStop(1, `rgba(${bloom.color.r}, ${bloom.color.g}, ${bloom.color.b}, 0)`);
          ctx.fillStyle = flashGrad;
          ctx.beginPath();
          ctx.arc(bloom.x, bloom.y, bloom.maxRadius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (bloom.phase === 'exploding' || bloom.phase === 'fading') {
        const bloomProgress = bloom.life / bloom.maxLife;

        if (bloomProgress > 0.3 && bloom.phase === 'exploding') {
          bloom.phase = 'fading';
        }

        // Soft center glow that breathes
        const centerAlpha = Math.max(0, 0.08 * (1 - bloomProgress) * (0.7 + Math.sin(bloom.life * 3) * 0.3));
        const glowSize = bloom.maxRadius * (0.3 + bloomProgress * 0.4);
        const centerGrad = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, glowSize);
        centerGrad.addColorStop(0, `rgba(${bloom.color.r}, ${bloom.color.g}, ${bloom.color.b}, ${centerAlpha})`);
        centerGrad.addColorStop(0.4, `rgba(${bloom.secondaryColor.r}, ${bloom.secondaryColor.g}, ${bloom.secondaryColor.b}, ${centerAlpha * 0.4})`);
        centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = centerGrad;
        ctx.beginPath();
        ctx.arc(bloom.x, bloom.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Update & draw particles
        for (let p = bloom.particles.length - 1; p >= 0; p--) {
          const particle = bloom.particles[p];
          particle.life += dt;

          if (particle.life >= particle.maxLife) {
            bloom.particles.splice(p, 1);
            continue;
          }

          const pProgress = particle.life / particle.maxLife;

          // Physics: gravity + drift + deceleration
          particle.vy += 0.15 * dt; // gentle gravity
          particle.vx *= particle.decay;
          particle.vy *= particle.decay;
          particle.vx += bloom.driftX * dt * 0.1;
          particle.vy += bloom.driftY * dt * 0.1;

          particle.x += particle.vx;
          particle.y += particle.vy;

          // Store trail positions
          particle.trail.push({
            x: particle.x,
            y: particle.y,
            alpha: 1 - pProgress,
          });
          if (particle.trail.length > 8) particle.trail.shift();

          // Alpha: fade in quickly, sustain, then fade out
          let alpha: number;
          if (pProgress < 0.05) {
            alpha = pProgress / 0.05;
          } else if (pProgress < 0.4) {
            alpha = 1;
          } else {
            alpha = 1 - ((pProgress - 0.4) / 0.6);
          }
          alpha *= 0.55; // muted overall
          alpha = Math.max(0, alpha);

          const { r, g, b } = particle.color;
          const size = particle.size * (1 - pProgress * 0.5);

          // Draw trail
          if (particle.trail.length > 2) {
            ctx.beginPath();
            ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
            for (let t = 1; t < particle.trail.length; t++) {
              ctx.lineTo(particle.trail[t].x, particle.trail[t].y);
            }
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.15})`;
            ctx.lineWidth = size * 0.5;
            ctx.stroke();
          }

          // Draw particle glow
          const pGrad = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, size * 3
          );
          pGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
          pGrad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
          pGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 3, 0, Math.PI * 2);
          ctx.fill();

          // Bright core
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)}, ${alpha * 0.6})`;
          ctx.fill();
        }

        // Remove dead blooms
        if (bloom.life > bloom.maxLife && bloom.particles.length === 0) {
          blooms.splice(b, 1);
        }
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        // Fill black on resize to prevent flash
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Seed initial blooms at different lifecycle stages
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 4; i++) {
      const bloom = createBloom(w, h);
      bloom.phase = 'exploding';
      bloom.y = bloom.targetY;
      bloom.x = bloom.targetX;
      bloom.life = randomBetween(0.2, 1);
      explodeBloom(bloom);
      bloomsRef.current.push(bloom);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
