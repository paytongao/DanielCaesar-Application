'use client';

import { useRef, useEffect, useCallback } from 'react';

// Rich, diverse chromesthesia palette — each color is a unique synesthetic tone
// Muted but luminous: think stained glass glowing in moonlight
const BLOOM_PALETTES = [
  // Deep violets & purples
  { r: 139, g: 92, b: 246 },
  { r: 109, g: 40, b: 217 },
  { r: 192, g: 132, b: 252 },
  { r: 167, g: 139, b: 250 },
  // Rose, magenta, blush
  { r: 236, g: 72, b: 153 },
  { r: 244, g: 114, b: 182 },
  { r: 219, g: 39, b: 119 },
  { r: 251, g: 113, b: 133 },
  // Blues — sapphire, cobalt, cerulean
  { r: 59, g: 130, b: 246 },
  { r: 14, g: 165, b: 233 },
  { r: 99, g: 102, b: 241 },
  { r: 56, g: 189, b: 248 },
  // Warm — amber, coral, peach, gold
  { r: 245, g: 158, b: 11 },
  { r: 251, g: 146, b: 60 },
  { r: 252, g: 211, b: 77 },
  { r: 251, g: 191, b: 36 },
  // Greens & teals — jade, emerald, seafoam
  { r: 16, g: 185, b: 129 },
  { r: 52, g: 211, b: 153 },
  { r: 20, g: 184, b: 166 },
  { r: 45, g: 212, b: 191 },
  // Exotic — crimson, electric indigo, burnt sienna, dusty mauve
  { r: 220, g: 38, b: 38 },
  { r: 129, g: 140, b: 248 },
  { r: 217, g: 119, b: 87 },
  { r: 196, g: 143, b: 171 },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: { r: number; g: number; b: number };
  size: number;
  decay: number;
}

interface Bloom {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  colors: { r: number; g: number; b: number }[];
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  phase: 'rising' | 'blooming' | 'fading';
  particles: Particle[];
  driftX: number;
  driftY: number;
  burstCount: number;
  rings: number;
}

// Ambient gradient orbs — large, soft, slow-drifting background color washes
interface GradientOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  pulseSpeed: number;
  pulsePhase: number;
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function pick() {
  return BLOOM_PALETTES[Math.floor(Math.random() * BLOOM_PALETTES.length)];
}

function pickN(n: number) {
  const colors: { r: number; g: number; b: number }[] = [];
  const pool = [...BLOOM_PALETTES];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    colors.push(pool.splice(idx, 1)[0]);
  }
  return colors;
}

function blendColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function createOrb(w: number, h: number): GradientOrb {
  return {
    x: rand(w * 0.1, w * 0.9),
    y: rand(h * 0.1, h * 0.9),
    vx: rand(-6, 6),
    vy: rand(-4, 4),
    radius: rand(150, 350),
    color: pick(),
    alpha: rand(0.015, 0.04),
    pulseSpeed: rand(0.3, 0.8),
    pulsePhase: rand(0, Math.PI * 2),
  };
}

function createBloom(w: number, h: number): Bloom {
  // Distribute blooms across the full viewport with center bias
  const cx = w / 2;
  const cy = h / 2;
  const spreadX = w * 0.45;
  const spreadY = h * 0.35;
  const targetX = cx + (Math.random() - 0.5) * 2 * spreadX;
  const targetY = cy + (Math.random() - 0.5) * 2 * spreadY - h * 0.05;

  // Start from below viewport or from edges
  const startX = targetX + rand(-60, 60);
  const startY = h + rand(20, 60);

  const colors = pickN(Math.floor(rand(2, 5)));

  return {
    x: startX,
    y: startY,
    targetX,
    targetY,
    colors,
    radius: 0,
    maxRadius: rand(70, 160),
    life: 0,
    maxLife: rand(4, 7),
    phase: 'rising',
    particles: [],
    driftX: rand(-5, 5),
    driftY: rand(-3, 1),
    burstCount: Math.floor(rand(35, 70)),
    rings: Math.floor(rand(2, 4)),
  };
}

function explodeBloom(bloom: Bloom) {
  const particles: Particle[] = [];

  for (let ring = 0; ring < bloom.rings; ring++) {
    const ringFrac = (ring + 1) / bloom.rings;
    const count = Math.floor(bloom.burstCount * ringFrac);
    const colorA = bloom.colors[ring % bloom.colors.length];
    const colorB = bloom.colors[(ring + 1) % bloom.colors.length];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rand(-0.2, 0.2);
      const speed = rand(0.3, 2.8) * ringFrac * (bloom.maxRadius / 120);
      const t = i / count;
      const color = blendColor(colorA, colorB, t);

      particles.push({
        x: bloom.x,
        y: bloom.y,
        vx: Math.cos(angle) * speed + rand(-0.15, 0.15),
        vy: Math.sin(angle) * speed + rand(-0.15, 0.15),
        life: 0,
        maxLife: rand(2, 4.5),
        color,
        size: rand(1.5, 4.5),
        decay: rand(0.93, 0.985),
      });
    }
  }

  // Graceful streamers — longer-lived arcing particles
  const streamerCount = Math.floor(rand(6, 14));
  for (let i = 0; i < streamerCount; i++) {
    const angle = (Math.PI * 2 * i) / streamerCount + rand(-0.1, 0.1);
    const speed = rand(2.5, 4.5);
    const color = bloom.colors[Math.floor(Math.random() * bloom.colors.length)];

    particles.push({
      x: bloom.x,
      y: bloom.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(0.3, 0.8),
      life: 0,
      maxLife: rand(2.5, 4),
      color,
      size: rand(2, 3.5),
      decay: 0.965,
    });
  }

  bloom.particles = particles;
}

export default function ChromesthesiaBlooms() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const bloomsRef = useRef<Bloom[]>([]);
  const orbsRef = useRef<GradientOrb[]>([]);
  const timeRef = useRef(0);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;
    timeRef.current += dt;
    const t = timeRef.current;

    // --- Layer 0: Fade previous frame (creates trails & afterglow) ---
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10, 10, 10, 0.14)';
    ctx.fillRect(0, 0, w, h);

    // --- Layer 1: Ambient gradient orbs (large, soft, drifting) ---
    ctx.globalCompositeOperation = 'lighter';
    for (const orb of orbsRef.current) {
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;

      // Soft bounce off edges
      if (orb.x < -orb.radius * 0.5) orb.vx = Math.abs(orb.vx);
      if (orb.x > w + orb.radius * 0.5) orb.vx = -Math.abs(orb.vx);
      if (orb.y < -orb.radius * 0.5) orb.vy = Math.abs(orb.vy);
      if (orb.y > h + orb.radius * 0.5) orb.vy = -Math.abs(orb.vy);

      const pulse = Math.sin(t * orb.pulseSpeed + orb.pulsePhase) * 0.3 + 0.7;
      const alpha = orb.alpha * pulse;
      const { r, g, b } = orb.color;

      const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
      grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${alpha * 0.15})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Layer 2: Spawn firework blooms ---
    spawnTimerRef.current -= dt;
    if (spawnTimerRef.current <= 0) {
      bloomsRef.current.push(createBloom(w, h));
      spawnTimerRef.current = rand(0.8, 2.0);
    }

    // --- Layer 3: Update & draw blooms ---
    const blooms = bloomsRef.current;
    for (let b = blooms.length - 1; b >= 0; b--) {
      const bloom = blooms[b];
      bloom.life += dt;

      if (bloom.phase === 'rising') {
        // Ascending trail — small glowing point rising up
        const riseT = Math.min(bloom.life / 0.9, 1);
        const ease = 1 - Math.pow(1 - riseT, 3);
        bloom.x += (bloom.targetX - bloom.x) * 0.025;
        bloom.y += (bloom.targetY - bloom.y) * (0.03 + ease * 0.05);

        const trailAlpha = 0.25 * (1 - riseT * 0.4);
        const c = bloom.colors[0];
        const tGrad = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, 8);
        tGrad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${trailAlpha})`);
        tGrad.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, ${trailAlpha * 0.3})`);
        tGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.arc(bloom.x, bloom.y, 8, 0, Math.PI * 2);
        ctx.fill();

        if (Math.abs(bloom.y - bloom.targetY) < 20 || bloom.life > 1.3) {
          bloom.phase = 'blooming';
          bloom.life = 0;
          explodeBloom(bloom);

          // Initial soft flash
          const flashR = bloom.maxRadius * 0.5;
          const fc = bloom.colors[0];
          const fGrad = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, flashR);
          fGrad.addColorStop(0, `rgba(${fc.r}, ${fc.g}, ${fc.b}, 0.06)`);
          fGrad.addColorStop(0.4, `rgba(${fc.r}, ${fc.g}, ${fc.b}, 0.05)`);
          fGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.arc(bloom.x, bloom.y, flashR, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const bloomT = bloom.life / bloom.maxLife;
        if (bloomT > 0.3 && bloom.phase === 'blooming') bloom.phase = 'fading';

        // Large soft center glow — the "bloom" effect — fading gradient
        const glowAlpha = Math.max(0, 0.03 * (1 - bloomT) * (0.6 + Math.sin(bloom.life * 2) * 0.4));
        const glowR = bloom.maxRadius * (0.4 + bloomT * 0.6);
        for (let ci = 0; ci < Math.min(bloom.colors.length, 2); ci++) {
          const c = bloom.colors[ci];
          const offset = ci * 15;
          const gGrad = ctx.createRadialGradient(
            bloom.x + offset, bloom.y - offset, 0,
            bloom.x + offset, bloom.y - offset, glowR
          );
          gGrad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${glowAlpha})`);
          gGrad.addColorStop(0.35, `rgba(${c.r}, ${c.g}, ${c.b}, ${glowAlpha * 0.4})`);
          gGrad.addColorStop(0.7, `rgba(${c.r}, ${c.g}, ${c.b}, ${glowAlpha * 0.1})`);
          gGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gGrad;
          ctx.beginPath();
          ctx.arc(bloom.x + offset, bloom.y - offset, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Update & draw particles
        for (let p = bloom.particles.length - 1; p >= 0; p--) {
          const particle = bloom.particles[p];
          particle.life += dt;

          if (particle.life >= particle.maxLife) {
            bloom.particles.splice(p, 1);
            continue;
          }

          const pT = particle.life / particle.maxLife;

          // Physics
          particle.vy += 0.12 * dt;
          particle.vx *= particle.decay;
          particle.vy *= particle.decay;
          particle.vx += bloom.driftX * dt * 0.08;
          particle.vy += bloom.driftY * dt * 0.08;
          particle.x += particle.vx;
          particle.y += particle.vy;

          // Fade curve: quick in, sustain, long fade out
          let alpha: number;
          if (pT < 0.03) alpha = pT / 0.03;
          else if (pT < 0.3) alpha = 1;
          else alpha = 1 - ((pT - 0.3) / 0.7);

          alpha *= 0.3;
          alpha = Math.max(0, alpha);

          const { r, g, b } = particle.color;
          const size = particle.size * (1 - pT * 0.4);

          // Soft outer glow
          const pGrad = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, size * 4
          );
          pGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
          pGrad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
          pGrad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${alpha * 0.08})`);
          pGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 4, 0, Math.PI * 2);
          ctx.fill();

          // Bright core
          const coreAlpha = alpha * 0.4;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${Math.min(255, r + 70)}, ${Math.min(255, g + 70)}, ${Math.min(255, b + 70)}, ${coreAlpha})`;
          ctx.fill();
        }

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
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Seed ambient gradient orbs spread across the viewport
    for (let i = 0; i < 5; i++) {
      orbsRef.current.push(createOrb(w, h));
    }

    // Seed initial blooms already in progress, spread across viewport
    for (let i = 0; i < 3; i++) {
      const bloom = createBloom(w, h);
      bloom.phase = 'blooming';
      bloom.y = bloom.targetY;
      bloom.x = bloom.targetX;
      bloom.life = rand(0.3, 1.5);
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
