<script lang="ts">
  import { EXERCISES, type SignalType } from '$lib/ai/exercises.config';
  let { selected, onselect }: { selected: string; onselect: (id: string) => void } = $props();

  const exercises = Object.values(EXERCISES);

  // Group by signal type for better organization
  const categories: { label: string; type: SignalType; emoji: string }[] = [
    { label: 'Push', type: 'elbow-angle', emoji: '💪' },
    { label: 'Jambes', type: 'knee-angle', emoji: '🦵' },
    { label: 'Epaules', type: 'shoulder-angle', emoji: '🏋️' },
    { label: 'Hanches', type: 'hip-angle', emoji: '🍑' },
    { label: 'Abdos', type: 'torso-ratio', emoji: '🔥' },
  ];

  let activeCategory = $state<SignalType>('elbow-angle');
  const filtered = $derived(exercises.filter(ex => ex.signalType === activeCategory));

  // Auto-select category based on current selection
  $effect(() => {
    const currentEx = exercises.find(ex => ex.id === selected);
    if (currentEx) activeCategory = currentEx.signalType;
  });
</script>

<!-- Category tabs -->
<div class="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-hide">
  {#each categories as cat}
    {@const count = exercises.filter(e => e.signalType === cat.type).length}
    <button
      class="shrink-0 py-1.5 px-2.5 rounded-lg text-[0.55rem] font-bold tracking-[1px] uppercase transition-all
        {activeCategory === cat.type
          ? 'bg-primary/20 text-primary border border-primary/40'
          : 'bg-surface/60 text-dim/50 border border-white/[0.06] hover:border-primary/20'}"
      onclick={() => { activeCategory = cat.type; }}
    >
      {cat.emoji} {cat.label} <span class="opacity-50">({count})</span>
    </button>
  {/each}
</div>

<!-- Exercise buttons (scrollable horizontal) -->
<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
  {#each filtered as ex}
    <div class="shrink-0 relative group">
      <div class="absolute inset-0 -skew-x-3 rounded-[12px] transition-colors
        {selected === ex.id ? 'bg-primary/20' : 'bg-transparent group-hover:bg-primary/[0.06]'}"></div>
      <button
        class="relative py-3 px-4 rounded-[12px] text-[0.65rem] font-bold tracking-[1.5px] uppercase transition-all -skew-x-3 whitespace-nowrap
          {selected === ex.id
            ? 'bg-primary/90 backdrop-blur-sm text-white border-l-2 border-primary shadow-[0_0_12px_rgba(230,57,70,0.2)]'
            : 'bg-surface/80 backdrop-blur-sm border border-white/10 text-dim hover:border-primary/40'}"
        onclick={() => onselect(ex.id)}
      >
        <span class="inline-block skew-x-3">{ex.name}</span>
      </button>
    </div>
  {/each}
</div>

<style>
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
