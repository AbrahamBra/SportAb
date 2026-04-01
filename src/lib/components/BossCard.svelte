<script lang="ts">
  import type { Boss } from '$lib/game/bosses';
  let { boss, selected, locked, onclick }: {
    boss: Boss; selected: boolean; locked: boolean; onclick: () => void;
  } = $props();

  const meta = $derived(
    `${boss.difficulty.charAt(0).toUpperCase() + boss.difficulty.slice(1)}  ·  ${boss.hp} reps  ·  ${Math.floor(boss.timeLimitSecs / 60)} min`
  );
</script>

<button
  class="w-full relative group transition-all select-none text-left"
  onclick={locked ? undefined : onclick}
  disabled={locked}
  style="animation: slideInLeft 0.4s ease-out both"
>
  <!-- Glow layer (selected only) -->
  {#if selected}
    <div class="absolute inset-0 -skew-x-[12deg] rounded-lg"
      style="background: rgba(230,57,70,0.08); animation: pulseGlow 2.5s ease-in-out infinite;"></div>
  {/if}

  <!-- Card body -->
  <div class="relative backdrop-blur-sm border-l-4 rounded-lg transition-all duration-200 overflow-hidden
    {selected
      ? 'bg-surface/90 border-primary border-y border-r border-white/10 shadow-[0_0_20px_rgba(230,57,70,0.25)]'
      : 'bg-surface/60 border-white/15 border-y border-r border-white/[0.05]'}
    {locked ? 'opacity-40' : 'group-hover:border-primary/50 group-hover:bg-surface/80'}
    -skew-x-[12deg]"
  >
    <!-- Inner scan line on hover -->
    {#if !locked}
      <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
        bg-[linear-gradient(rgba(230,57,70,0.04)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none"></div>
    {/if}

    <div class="skew-x-[12deg] flex items-center justify-between px-4 py-3.5">
      <div class="flex flex-col gap-1">
        <!-- Status dot + name -->
        <div class="flex items-center gap-2">
          {#if selected}
            <span class="w-1.5 h-1.5 rounded-full bg-primary"
              style="animation: statusDot 1.2s ease-in-out infinite; box-shadow: 0 0 6px rgba(230,57,70,0.8)"></span>
          {/if}
          <span class="font-black tracking-[3px] uppercase text-sm
            {selected ? 'text-white' : 'text-white/80'}"
            style="{selected ? 'text-shadow: 0 0 12px rgba(230,57,70,0.6)' : ''}"
          >{boss.name}</span>
        </div>
        <span class="text-xs text-dim font-mono tracking-[1px]">
          {locked ? `◆ LVL ${boss.requiredLevel} REQUIRED` : meta}
        </span>
      </div>

      <div class="flex flex-col items-end gap-0.5">
        {#if locked}
          <span class="text-dim text-base opacity-60">⬡</span>
        {:else}
          <span class="text-2xl font-black font-mono {selected ? 'text-primary' : 'text-primary/70'}"
            style="{selected ? 'text-shadow: 0 0 15px rgba(230,57,70,0.7)' : ''}"
          >{boss.hp}</span>
          <span class="text-[0.55rem] text-dim font-mono tracking-[3px]">HP</span>
        {/if}
      </div>
    </div>
  </div>
</button>
