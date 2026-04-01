<script lang="ts">
  import { xpForNextLevel } from '$lib/game/progression';
  let { xp, level }: { xp: number; level: number } = $props();
  const nextXP = $derived(xpForNextLevel(level));
  const prevXP = $derived(level > 1 ? xpForNextLevel(level - 1) : 0);
  const progress = $derived(nextXP > prevXP ? ((xp - prevXP) / (nextXP - prevXP)) * 100 : 0);
</script>
<div class="w-full">
  <div class="flex justify-between text-xs tracking-[2px] text-dim mb-1">
    <span>LEVEL {level}</span>
    <span>{xp} / {nextXP} XP</span>
  </div>
  <div class="h-2 bg-white/10 rounded-full overflow-hidden">
    <div class="h-full bg-gold rounded-full transition-[width] duration-500" style="width: {Math.min(100, Math.max(0, progress))}%"></div>
  </div>
</div>
