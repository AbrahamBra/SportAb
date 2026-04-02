<script lang="ts">
  import { onMount } from 'svelte';

  let {
    class: className = '',
  }: {
    class?: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let particles: Particle[] = [];
  let animHandle = 0;
  let running = false;

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    type: 'spark' | 'star' | 'ring';
  }

  const COLORS_NORMAL = ['#E63946', '#ff6b6b', '#ff8a8a', '#ffffff'];
  const COLORS_CRIT = ['#FFD166', '#ffec99', '#E63946', '#ff6b6b', '#ffffff'];

  function randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /** Spawn a burst of particles at a position (0-1 normalized coordinates) */
  export function burst(nx: number, ny: number, intensity: number = 1): void {
    if (!canvas) return;
    const cx = nx * canvas.width;
    const cy = ny * canvas.height;
    const isCrit = intensity >= 2;
    const count = isCrit ? 18 + Math.floor(intensity * 4) : 10;
    const colors = isCrit ? COLORS_CRIT : COLORS_NORMAL;
    const speed = isCrit ? 6 : 4;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + randomInRange(-0.3, 0.3);
      const vel = randomInRange(speed * 0.5, speed * 1.5);
      const life = randomInRange(0.3, 0.7);
      particles.push({
        x: cx + randomInRange(-8, 8),
        y: cy + randomInRange(-8, 8),
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel - randomInRange(1, 3), // bias upward
        life,
        maxLife: life,
        size: randomInRange(isCrit ? 3 : 2, isCrit ? 7 : 5),
        color: colors[Math.floor(Math.random() * colors.length)]!,
        type: Math.random() > 0.7 ? 'star' : Math.random() > 0.5 ? 'ring' : 'spark',
      });
    }

    // Bonus: a few bigger slow particles for crits
    if (isCrit) {
      for (let i = 0; i < 4; i++) {
        const angle = randomInRange(0, Math.PI * 2);
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * randomInRange(1, 2.5),
          vy: Math.sin(angle) * randomInRange(1, 2.5) - 2,
          life: 0.8,
          maxLife: 0.8,
          size: randomInRange(6, 10),
          color: '#FFD166',
          type: 'ring',
        });
      }
    }

    if (!running) startLoop();
  }

  function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const spikes = 4;
    const outerR = size;
    const innerR = size * 0.4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function render(): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== canvas.offsetWidth) canvas.width = canvas.offsetWidth;
    if (canvas.height !== canvas.offsetHeight) canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dt = 1 / 60; // assume 60fps
    const alive: Particle[] = [];

    for (const p of particles) {
      p.life -= dt;
      if (p.life <= 0) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.vx *= 0.98; // friction

      const alpha = Math.max(0, p.life / p.maxLife);
      const currentSize = p.size * (0.5 + 0.5 * alpha);

      ctx.globalAlpha = alpha;

      if (p.type === 'star') {
        ctx.fillStyle = p.color;
        drawStar(ctx, p.x, p.y, currentSize);
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // spark — small filled circle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }

      alive.push(p);
    }

    ctx.globalAlpha = 1;
    particles = alive;

    if (particles.length > 0) {
      animHandle = requestAnimationFrame(render);
    } else {
      running = false;
    }
  }

  function startLoop(): void {
    running = true;
    animHandle = requestAnimationFrame(render);
  }

  onMount(() => {
    return () => {
      cancelAnimationFrame(animHandle);
    };
  });
</script>

<canvas
  bind:this={canvas}
  class="absolute inset-0 w-full h-full pointer-events-none {className}"
  style="z-index: 14;"
></canvas>
