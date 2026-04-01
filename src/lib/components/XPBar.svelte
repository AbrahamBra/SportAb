<script lang="ts">
  import { xpForNextLevel } from '$lib/game/progression';
  let { xp, level }: { xp: number; level: number } = $props();
  const nextXP    = $derived(xpForNextLevel(level));
  const prevXP    = $derived(level > 1 ? xpForNextLevel(level - 1) : 0);
  const progress  = $derived(nextXP > prevXP ? ((xp - prevXP) / (nextXP - prevXP)) * 100 : 0);
  const pct       = $derived(Math.min(100, Math.max(0, progress)));
</script>

<div class="w-full">
  <div class="flex justify-between text-[0.65rem] tracking-[3px] mb-1.5 font-mono">
    <span class="text-gold font-bold" style="text-shadow: 0 0 10px rgba(255,209,102,0.6)">LEVEL {level}</span>
    <span class="text-dim/70">{xp} / {nextXP} XP</span>
  </div>
  <div class="relative h-2 bg-white/[0.06] rounded-sm overflow-hidden border border-white/[0.04]">
    <div class="h-full rounded-sm transition-[width] duration-700 ease-out"
      style="
        width: {pct}%;
        background: linear-gradient(to right, #B8943F, #FFD166);
        box-shadow: 0 0 10px rgba(255,209,102,0.5), 0 0 20px rgba(255,209,102,0.2);
      "
    ></div>
  </div>
</div>
