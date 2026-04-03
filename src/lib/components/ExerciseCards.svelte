<script lang="ts">
  import { EXERCISES } from '$lib/ai/exercises.config';

  let {
    selected = '',
    onSelect,
    readonly = false,
  }: {
    selected?: string;
    onSelect?: (id: string) => void;
    readonly?: boolean;
  } = $props();

  const SIGNAL_EMOJI: Record<string, string> = {
    'elbow-angle': '💪',
    'knee-angle': '🦵',
    'hip-angle': '🍑',
    'shoulder-angle': '🏋️',
  };

  const exercises = Object.values(EXERCISES).filter(e => e.signalType !== 'torso-ratio');
</script>

<div class="grid grid-cols-3 gap-3 w-full">
  {#each exercises as ex (ex.id)}
    <button
      type="button"
      disabled={readonly}
      onclick={() => onSelect?.(ex.id)}
      class="relative flex flex-col items-center gap-1 rounded-xl border p-3 transition-all duration-200
        {selected === ex.id
          ? 'border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)] scale-105'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}
        {readonly ? 'cursor-default' : 'cursor-pointer active:scale-95'}"
    >
      <span class="text-2xl">{SIGNAL_EMOJI[ex.signalType] ?? '⚡'}</span>
      <span class="text-xs text-center leading-tight text-white/80">{ex.name}</span>
      {#if selected === ex.id}
        <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
      {/if}
    </button>
  {/each}
</div>
