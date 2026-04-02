<script lang="ts">
  let { targetReps, suggestedWeight = null, isProgression = false, onSubmit }: {
    targetReps: string;
    suggestedWeight?: number | null;
    isProgression?: boolean;
    onSubmit: (reps: number, weightKg?: number) => void;
  } = $props();

  let reps = $state(parseInt(targetReps) || 10);
  let weight = $state(suggestedWeight ?? 0);
  let showWeight = $state(suggestedWeight !== null && suggestedWeight > 0);

  // Update weight when suggestedWeight changes
  $effect(() => {
    if (suggestedWeight !== null && suggestedWeight > 0) {
      weight = suggestedWeight;
      showWeight = true;
    }
  });

  function adjustReps(delta: number): void {
    reps = Math.max(0, reps + delta);
  }

  function adjustWeight(delta: number): void {
    weight = Math.max(0, +(weight + delta).toFixed(1));
  }

  function submit(): void {
    if (reps <= 0) return;
    onSubmit(reps, weight > 0 ? weight : undefined);
  }
</script>

<div class="flex flex-col items-center gap-5 w-full">
  <!-- Reps input -->
  <div class="flex flex-col items-center gap-2">
    <span class="font-mono text-[0.55rem] tracking-[4px] text-dim/60 uppercase">Reps (cible: {targetReps})</span>
    <div class="flex items-center gap-3">
      <button
        class="w-11 h-11 rounded-lg bg-surface/80 border border-white/[0.1] text-white text-lg font-bold
          hover:border-primary/40 active:scale-95 transition-all"
        onclick={() => adjustReps(-1)}
      >−</button>
      <span class="font-mono text-4xl font-black text-primary w-20 text-center"
        style="text-shadow: 0 0 15px rgba(230,57,70,0.5)"
      >{reps}</span>
      <button
        class="w-11 h-11 rounded-lg bg-surface/80 border border-white/[0.1] text-white text-lg font-bold
          hover:border-primary/40 active:scale-95 transition-all"
        onclick={() => adjustReps(1)}
      >+</button>
    </div>
  </div>

  <!-- Weight input (auto-shown if suggested weight exists) -->
  {#if !showWeight}
    <button
      class="text-[0.6rem] font-mono text-dim/50 tracking-[2px] hover:text-gold/70 transition-colors"
      onclick={() => { showWeight = true; }}
    >+ AJOUTER POIDS</button>
  {:else}
    <div class="flex flex-col items-center gap-2" style="animation: fadeInUp 0.3s ease-out both">
      <div class="flex items-center gap-2">
        <span class="font-mono text-[0.55rem] tracking-[4px] text-dim/60 uppercase">Poids (kg)</span>
        {#if isProgression}
          <span class="text-[0.5rem] font-bold text-gold tracking-[1px]"
            style="text-shadow: 0 0 8px rgba(255,209,102,0.5)">↑ AUGMENTE</span>
        {/if}
      </div>
      <div class="flex items-center gap-3">
        <button
          class="w-11 h-11 rounded-lg bg-surface/80 border border-white/[0.1] text-white text-lg font-bold
            hover:border-gold/40 active:scale-95 transition-all"
          onclick={() => adjustWeight(-2.5)}
        >−</button>
        <span class="font-mono text-2xl font-bold w-20 text-center
          {isProgression ? 'text-gold' : 'text-gold'}"
          style="text-shadow: 0 0 10px rgba(255,209,102,0.4)"
        >{weight}</span>
        <button
          class="w-11 h-11 rounded-lg bg-surface/80 border border-white/[0.1] text-white text-lg font-bold
            hover:border-gold/40 active:scale-95 transition-all"
          onclick={() => adjustWeight(2.5)}
        >+</button>
      </div>
    </div>
  {/if}

  <!-- Submit -->
  <button
    class="w-full max-w-[240px] py-3.5 bg-primary text-white font-black rounded-[14px] text-[0.85rem] tracking-[4px] uppercase
      hover:bg-primary-hover active:scale-[0.97] transition-all -skew-x-[8deg]
      shadow-[0_0_20px_rgba(230,57,70,0.3)]"
    onclick={submit}
  >
    <span class="inline-block skew-x-[8deg]">VALIDER ✓</span>
  </button>
</div>
