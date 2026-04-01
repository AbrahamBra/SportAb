<script lang="ts">
  import type { BattleState } from '$lib/game/battle-engine';
  import type { Boss } from '$lib/game/bosses';
  let { state, boss, onClaim }: { state: BattleState; boss: Boss; onClaim: () => void } = $props();
  const timeLeft = $derived(boss.timeLimitSecs - state.timeElapsedSecs);
  const fmtTime = $derived(`${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`);
</script>
<div class="flex flex-col items-center text-center px-7 py-14 gap-0">
  <h1 class="text-5xl font-black tracking-[8px] text-gold" style="text-shadow: 0 0 50px rgba(255,209,102,0.5); animation: fadeInUp 0.5s ease-out both">VICTORY</h1>
  <p class="text-xs tracking-[4px] text-dim mt-1">SLAIN</p>
  <p class="text-xl font-black tracking-[5px] text-primary mt-1 mb-9">{boss.name}</p>
  <div class="bg-surface border-[1.5px] border-gold/25 rounded-[18px] px-12 py-6 mb-5" style="animation: fadeInUp 0.5s 0.15s ease-out both">
    <p class="text-5xl font-black text-gold">+{state.xpEarned}</p>
    <p class="text-xs tracking-[5px] text-dim mt-1">XP EARNED</p>
  </div>
  <div class="flex gap-7 mb-10 text-sm text-dim" style="animation: fadeInUp 0.5s 0.25s ease-out both">
    <span>⚡ <strong class="text-white font-bold">{state.reps}</strong> reps</span>
    <span>⏱ <strong class="text-white font-bold">{fmtTime}</strong> left</span>
  </div>
  <button class="w-full py-4 bg-primary text-white font-black rounded-[14px] tracking-[4px] uppercase hover:bg-primary-hover active:scale-[0.98] transition-all" onclick={onClaim}>CLAIM REWARDS</button>
</div>
<style>
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
</style>
