<script lang="ts">
  import type { Boss } from '$lib/game/bosses';
  let { boss, selected, locked, onclick }: { boss: Boss; selected: boolean; locked: boolean; onclick: () => void } = $props();
  const meta = $derived(`${boss.difficulty.charAt(0).toUpperCase() + boss.difficulty.slice(1)}  ·  ${boss.hp} reps  ·  ${Math.floor(boss.timeLimitSecs / 60)} min`);
</script>
<button
  class="w-full bg-surface border-[1.5px] rounded-[14px] p-4 flex items-center justify-between transition-all select-none text-left
    {selected ? 'border-primary bg-primary/10' : 'border-white/[0.07] hover:border-primary/50 hover:bg-primary/[0.05]'}
    {locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
  onclick={locked ? undefined : onclick}
  disabled={locked}
>
  <div class="flex flex-col gap-1">
    <span class="font-black tracking-[3px] uppercase">{boss.name}</span>
    <span class="text-sm text-dim font-normal tracking-[1px]">{locked ? `Level ${boss.requiredLevel} required` : meta}</span>
  </div>
  <div class="text-2xl font-black text-primary flex flex-col items-end">
    {#if locked}
      <span class="text-dim text-lg">🔒</span>
    {:else}
      {boss.hp}<span class="text-xs text-dim font-normal tracking-[2px]">HP</span>
    {/if}
  </div>
</button>
