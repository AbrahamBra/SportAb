<script lang="ts">
  import { onMount } from 'svelte';
  import type { SpriteConfig, AnimationType, SpriteAnimation } from '$lib/game/sprite-config';

  let {
    sprite,
    animation = 'idle',
    onAnimationEnd,
    class: className = '',
  }: {
    sprite: SpriteConfig;
    animation: AnimationType;
    onAnimationEnd?: () => void;
    class?: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let frameCache: Map<string, HTMLImageElement[]> = new Map();
  let currentFrame = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let prevAnim: AnimationType = animation;

  function cacheKey(anim: SpriteAnimation): string {
    return `${anim.folder}|${anim.prefix}`;
  }

  function loadFrames(anim: SpriteAnimation): Promise<HTMLImageElement[]> {
    const key = cacheKey(anim);
    const cached = frameCache.get(key);
    if (cached) return Promise.resolve(cached);

    return Promise.all(
      Array.from({ length: anim.frames }, (_, i) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Sprite fail: ${anim.prefix}${i + 1}`));
          img.src = `${anim.folder}/${anim.prefix}${i + 1}.png`;
        })
      )
    ).then(imgs => {
      frameCache.set(key, imgs);
      return imgs;
    });
  }

  function drawFrame(): void {
    if (!canvas) return;

    // Detect animation change
    if (prevAnim !== animation) {
      prevAnim = animation;
      currentFrame = 0;
    }

    const animCfg = sprite.animations[animation];
    if (!animCfg) return;

    const frames = frameCache.get(cacheKey(animCfg));
    if (!frames || frames.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const idx = currentFrame % frames.length;
    const img = frames[idx];
    if (!img) return;
    const w = Math.round(img.naturalWidth * sprite.scale);
    const h = Math.round(img.naturalHeight * sprite.scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);

    // Advance
    if (currentFrame + 1 >= animCfg.frames) {
      if (animCfg.loop) {
        currentFrame = 0;
      } else {
        onAnimationEnd?.();
      }
    } else {
      currentFrame++;
    }
  }

  function startLoop(): void {
    stopLoop();
    const animCfg = sprite.animations[animation];
    const fps = animCfg?.fps ?? 8;
    intervalId = setInterval(drawFrame, 1000 / fps);
    // Draw first frame immediately
    drawFrame();
  }

  function stopLoop(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  onMount(() => {
    const anims = Object.values(sprite.animations).filter(Boolean) as SpriteAnimation[];
    Promise.allSettled(anims.map(a => loadFrames(a))).then(() => {
      startLoop();
    });
    return stopLoop;
  });
</script>

<canvas
  bind:this={canvas}
  class="pointer-events-none {className}"
  style="image-rendering: pixelated;"
></canvas>
