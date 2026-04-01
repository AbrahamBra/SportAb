<script lang="ts">
  import { onMount } from 'svelte';
  let container: HTMLDivElement;

  onMount(() => {
    // Twinkling stars
    for (let i = 0; i < 55; i++) {
      const star = document.createElement('div');
      const size = Math.random() * 2 + 0.5;
      const delay = Math.random() * 6;
      const dur = 2 + Math.random() * 4;
      star.className = 'absolute rounded-full bg-white pointer-events-none';
      star.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random()*100}%; top:${Math.random()*100}%;
        animation: twinkle ${dur}s infinite alternate ${delay}s;
        opacity: 0.05;
      `;
      container.appendChild(star);
    }
  });
</script>

<div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">

  <!-- Grid pattern -->
  <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

  <!-- Vignette -->
  <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_40%,rgba(0,0,0,0.7)_100%)]"></div>

  <!-- Red orb top-right -->
  <div class="absolute top-[-80px] right-[-60px] w-[380px] h-[380px] rounded-full"
    style="background: radial-gradient(circle, rgba(230,57,70,0.18) 0%, transparent 70%);
           animation: orb 12s ease-in-out infinite;"></div>

  <!-- Gold orb bottom-left -->
  <div class="absolute bottom-[10%] left-[-60px] w-[260px] h-[260px] rounded-full"
    style="background: radial-gradient(circle, rgba(255,209,102,0.10) 0%, transparent 70%);
           animation: orb 16s ease-in-out infinite reverse;"></div>

  <!-- Dark-red secondary orb -->
  <div class="absolute top-[50%] right-[20%] w-[180px] h-[180px] rounded-full"
    style="background: radial-gradient(circle, rgba(160,16,26,0.12) 0%, transparent 70%);
           animation: orb 20s ease-in-out infinite 4s;"></div>

  <!-- Scanline sweep (slow, subtle) -->
  <div class="absolute left-0 right-0 h-[2px] pointer-events-none"
    style="background: linear-gradient(to right, transparent, rgba(230,57,70,0.12), transparent);
           animation: scanline 10s linear infinite;"></div>

  <!-- Stars container -->
  <div bind:this={container} class="absolute inset-0"></div>
</div>

<style>
  @keyframes twinkle {
    from { opacity: 0.03; }
    to   { opacity: 0.55; }
  }
</style>
