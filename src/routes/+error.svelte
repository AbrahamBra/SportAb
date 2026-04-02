<script lang="ts">
  import { page } from '$app/state';
  import DiamondIcon from '$lib/components/icons/DiamondIcon.svelte';
</script>

<div class="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
  <div class="max-w-[380px] mx-auto flex flex-col items-center gap-5">

    <!-- Glitch error code -->
    <span class="font-mono text-7xl font-black text-primary"
      style="text-shadow: 0 0 30px color-mix(in srgb, var(--color-primary) 60%, transparent);
             animation: glitchRed 4s ease-in-out infinite;">
      {page.status}
    </span>

    <!-- Message -->
    <h1 class="text-xl font-black tracking-[4px] uppercase italic text-white">
      {page.status === 404 ? 'PAGE INTROUVABLE' : 'ERREUR SYSTEME'}
    </h1>

    <p class="font-mono text-[0.65rem] text-dim/60 tracking-[2px] leading-relaxed">
      {page.status === 404
        ? 'Ce boss n\'existe pas... encore.'
        : page.error?.message ?? 'Quelque chose s\'est mal passe. Reessaye.'}
    </p>

    <!-- Back button -->
    <a href="/"
      class="mt-4 py-3.5 px-8 bg-primary text-white font-black rounded-[14px] text-[0.8rem] tracking-[4px] uppercase
        hover:bg-primary-hover active:scale-[0.97] transition-all -skew-x-[8deg] inline-block"
      style="box-shadow: 0 0 20px color-mix(in srgb, var(--color-primary) 30%, transparent)">
      <span class="inline-block skew-x-[8deg]"><DiamondIcon /> RETOUR AU QG</span>
    </a>
  </div>
</div>
