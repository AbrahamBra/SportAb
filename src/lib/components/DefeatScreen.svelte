<script lang="ts">
  import type { BattleState } from '$lib/game/battle-engine';
  import type { Boss } from '$lib/game/bosses';
  let { state, boss, onRetry, onEasier }: { state: BattleState; boss: Boss; onRetry: () => void; onEasier?: () => void } = $props();
  const pct = $derived(Math.round((state.damageDealt / state.bossMaxHP) * 100));
  const encouragement = $derived(
    pct >= 80 ? 'SO CLOSE! One more try!' : pct >= 50 ? 'Great effort! Keep pushing!' : 'Every rep counts. You got this!'
  );
</script>
<div class="flex flex-col items-center text-center px-7 py-14 gap-0">
  <h1 class="text-4xl font-black tracking-[5px] text-primary mb-2">TIME'S UP!</h1>
  <div class="bg-surface rounded-[14px] px-8 py-5 mb-4 w-full">
    <p class="text-2xl font-black text-white">{state.damageDealt} / {state.bossMaxHP} <span class="text-sm text-dim">damage dealt</span></p>
    <div class="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
      <div class="h-full bg-primary rounded-full" style="width: {pct}%"></div>
    </div>
  </div>
  <p class="text-sm text-gold tracking-[2px] mb-8">{encouragement}</p>
  <button class="w-full py-4 bg-primary text-white font-black rounded-[14px] tracking-[4px] uppercase hover:bg-primary-hover active:scale-[0.98] transition-all mb-3" onclick={onRetry}>TRY AGAIN</button>
  {#if onEasier}
  <button class="w-full py-3 bg-transparent border border-white/20 text-white/70 font-bold rounded-[14px] tracking-[2px] text-sm hover:border-white/40 transition-all" onclick={onEasier}>Try an easier boss</button>
  {/if}
</div>
