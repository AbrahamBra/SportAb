<script lang="ts">
  import type { BattleState } from '$lib/game/battle-engine';
  import type { Boss } from '$lib/game/bosses';
  let { state, boss, onRetry, onEasier }: {
    state: BattleState; boss: Boss; onRetry: () => void; onEasier?: () => void;
  } = $props();
  const pct = $derived(Math.round((state.damageDealt / state.bossMaxHP) * 100));
  const encouragement = $derived(
    pct >= 80 ? 'SO CLOSE. ONE MORE TRY.' : pct >= 50 ? 'GREAT EFFORT. KEEP PUSHING.' : 'EVERY REP COUNTS. ARISE.'
  );
</script>

<div class="flex flex-col items-center text-center px-7 py-12 gap-0 relative overflow-hidden">

  <!-- Dark vignette -->
  <div class="absolute inset-0 pointer-events-none"
    style="background: radial-gradient(ellipse 60% 40% at 50% 20%, rgba(230,57,70,0.06) 0%, transparent 70%)"></div>

  <!-- System label -->
  <div class="flex items-center gap-2 mb-6" style="animation: systemBoot 0.6s ease-out both">
    <span class="w-1.5 h-1.5 rounded-full bg-primary"
      style="animation: statusDot 0.8s ease-in-out infinite; box-shadow: 0 0 6px rgba(230,57,70,0.8)"></span>
    <span class="font-mono text-[0.58rem] tracking-[5px] text-primary/60 uppercase">COMBAT_FAILED</span>
  </div>

  <!-- Defeat line -->
  <div class="w-3/4 h-px mb-5"
    style="background: linear-gradient(to right, transparent, rgba(230,57,70,0.5), transparent);
           animation: victoryBeam 0.6s 0.1s ease-out both"></div>

  <h1 class="text-4xl font-black tracking-[6px] uppercase italic"
    style="color: #E63946; text-shadow: 0 0 25px rgba(230,57,70,0.5);
           animation: fadeInUp 0.5s 0.1s ease-out both">TIME'S UP</h1>
  <p class="font-mono text-[0.6rem] tracking-[5px] text-dim/50 mt-1 mb-7"
    style="animation: systemBoot 0.6s 0.3s ease-out both">YOU HAVE BEEN DEFEATED</p>

  <!-- Damage card -->
  <div class="relative w-full bg-surface/80 backdrop-blur-sm border border-primary/15 rounded-lg px-6 py-5 mb-4"
    style="animation: fadeInUp 0.5s 0.25s ease-out both">
    <div class="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/30"></div>
    <div class="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/30"></div>
    <div class="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/30"></div>
    <div class="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/30"></div>

    <p class="font-mono text-xl font-black text-white">{state.damageDealt}
      <span class="text-sm text-dim/60 font-normal">/ {state.bossMaxHP} damage</span>
    </p>
    <div class="relative h-2 bg-white/[0.06] rounded-sm overflow-hidden mt-3 border border-white/[0.04]">
      <div class="h-full rounded-sm transition-[width] duration-700 ease-out"
        style="width: {pct}%; background: linear-gradient(to right, #A0101A, #E63946);
               box-shadow: 0 0 8px rgba(230,57,70,0.5)"></div>
    </div>
    <p class="font-mono text-[0.6rem] text-dim/50 tracking-[2px] mt-2 text-right">{pct}% DEALT</p>
  </div>

  <p class="font-mono text-xs tracking-[3px] text-gold/70 mb-8"
    style="animation: fadeInUp 0.5s 0.35s ease-out both">{encouragement}</p>

  <!-- Try Again -->
  <div class="w-full relative mb-3" style="animation: fadeInUp 0.5s 0.45s ease-out both">
    <div class="absolute inset-0 -skew-x-[10deg] rounded-lg"
      style="background: rgba(230,57,70,0.1); animation: pulseGlow 2.5s ease-in-out infinite"></div>
    <button
      class="relative w-full py-4 bg-primary/90 text-white font-black rounded-lg tracking-[5px] uppercase
        hover:bg-primary active:scale-[0.97] transition-all -skew-x-[10deg]
        shadow-[0_0_20px_rgba(230,57,70,0.3)]"
      onclick={onRetry}
    >
      <span class="inline-block skew-x-[10deg]">⟳ TRY AGAIN</span>
    </button>
  </div>

  {#if onEasier}
    <button
      class="w-full py-3 border border-white/10 text-dim/60 font-mono text-xs rounded-lg tracking-[3px] hover:border-white/25 hover:text-dim/80 transition-all"
      style="animation: fadeInUp 0.5s 0.55s ease-out both"
      onclick={onEasier}
    >
      TRY AN EASIER BOSS
    </button>
  {/if}
</div>

<style>
  @keyframes victoryBeam {
    from { opacity: 0; transform: scaleX(0); }
    to   { opacity: 1; transform: scaleX(1); }
  }
</style>
