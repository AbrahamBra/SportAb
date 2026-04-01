<script lang="ts">
  import { EXERCISES } from '$lib/ai/exercises.config';
  let { selected, onselect }: { selected: string; onselect: (id: string) => void } = $props();
  const exercises = Object.values(EXERCISES);
</script>
<div class="flex gap-2">
  {#each exercises as ex}
  <button
    class="flex-1 py-3 rounded-[12px] text-sm font-bold tracking-[2px] uppercase transition-all
      {selected === ex.id ? 'bg-primary text-white' : 'bg-surface border border-white/10 text-dim hover:border-primary/40'}"
    onclick={() => onselect(ex.id)}
  >
    {ex.name}
  </button>
  {/each}
</div>
