<script lang="ts">
  import type { BattleState } from '$lib/game/battle-engine';
  import type { Boss } from '$lib/game/bosses';
  let { state, boss, onClaim }: { state: BattleState; boss: Boss; onClaim: () => void } = $props();
  const timeLeft = $derived(boss.timeLimitSecs - state.timeElapsedSecs);
  const fmtTime  = $derived(`${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`);
</script>

<div class="flex flex-col items-center text-center px-7 py-12 gap-0 relative overflow-hidden">

  <!-- Background burst rays -->
  <div class="absolute inset-0 pointer-events-none"
    style="background: radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,209,102,0.07) 0%, transparent 70%)"></div>

  <!-- System label -->
  <div class="flex items-center gap-2 mb-6" style="animation: systemBoot 0.6s ease-out both">
    <span class="w-1.5 h-1.5 rounded-full bg-gold"
      style="animation: statusDot 1.5s ease-in-out infinite; box-shadow: 0 0 6px rgba(255,209,102,0.8)"></span>
    <span class="font-mono text-[0.58rem] tracking-[5px] text-gold/60 uppercase">BOSS_DEFEATED</span>
  </div>

  <!-- Victory beam line -->
  <div class="w-3/4 h-px mb-5"
    style="background: linear-gradient(to right, transparent, rgba(255,209,102,0.6), transparent);
           animation: victoryBeam 0.6s 0.1s ease-out both"></div>

  <h1 class="text-5xl font-black tracking-[8px] uppercase italic"
    style="color: #FFD166; text-shadow: 0 0 30px rgba(255,209,102,0.6), 0 0 60px rgba(255,209,102,0.25);
           animation: fadeInUp 0.5s 0.1s ease-out both">VICTORY</h1>
  <p class="font-mono text-[0.6rem] tracking-[6px] text-dim/60 mt-1"
    style="animation: systemBoot 0.6s 0.3s ease-out both">ENEMY SLAIN</p>
  <p class="text-xl font-black tracking-[4px] text-primary mt-1.5 mb-8 uppercase italic"
    style="text-shadow: 0 0 15px rgba(230,57,70,0.6); animation: fadeInUp 0.5s 0.2s ease-out both">
    {boss.name}
  </p>

  <!-- XP card -->
  <div class="relative w-full bg-surface/80 backdrop-blur-sm border border-gold/20 rounded-lg px-10 py-6 mb-5"
    style="animation: fadeInUp 0.5s 0.3s ease-out both">
    <!-- Corner brackets -->
    <div class="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-gold/50"></div>
    <div class="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-gold/50"></div>
    <div class="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-gold/50"></div>
    <div class="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-gold/50"></div>

    <p class="font-mono text-5xl font-black"
      style="color: #FFD166; text-shadow: 0 0 30px rgba(255,209,102,0.7), 0 0 60px rgba(255,209,102,0.25);
             animation: pulseGlowGold 2s ease-in-out infinite">+{state.xpEarned}</p>
    <p class="font-mono text-[0.6rem] tracking-[6px] text-dim/60 mt-1 uppercase">XP Earned</p>
  </div>

  <!-- Stats row -->
  <div class="flex gap-8 mb-10 font-mono text-sm text-dim/70"
    style="animation: fadeInUp 0.5s 0.4s ease-out both">
    <span>⚡ <strong class="text-white">{state.reps}</strong> reps</span>
    <span>⏱ <strong class="text-white">{fmtTime}</strong> left</span>
  </div>

  <!-- Claim button -->
  <div class="w-full relative" style="animation: fadeInUp 0.5s 0.5s ease-out both">
    <div class="absolute inset-0 -skew-x-[10deg] rounded-lg"
      style="background: rgba(255,209,102,0.1); animation: pulseGlowGold 2.5s ease-in-out infinite"></div>
    <button
      class="relative w-full py-4 font-black rounded-lg tracking-[5px] uppercase transition-all
        active:scale-[0.97] -skew-x-[10deg]
        border border-gold/40 text-gold hover:bg-gold/10"
      style="text-shadow: 0 0 12px rgba(255,209,102,0.5)"
      onclick={onClaim}
    >
      <span class="inline-block skew-x-[10deg]">◆ CLAIM REWARDS ◆</span>
    </button>
  </div>
</div>

<style>
  @keyframes victoryBeam {
    from { opacity: 0; transform: scaleX(0); }
    to   { opacity: 1; transform: scaleX(1); }
  }
</style>
