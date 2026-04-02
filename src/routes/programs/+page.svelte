<script lang="ts">
  import { goto } from '$app/navigation';
  import type { ProgramGoal } from '$lib/data/types';
  import { getAllPrograms, filterPrograms } from '$lib/data';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';
  import ProgramCard from '$lib/components/ProgramCard.svelte';
  import GoalFilter from '$lib/components/GoalFilter.svelte';

  let selectedGoal = $state<ProgramGoal | null>(null);
  let selectedProgramId = $state<string | null>(null);

  const programs = $derived(
    selectedGoal ? filterPrograms({ goal: selectedGoal }) : getAllPrograms()
  );

  function selectProgram(id: string) {
    selectedProgramId = id;
  }

  function viewProgram() {
    if (selectedProgramId) goto(`/programs/${selectedProgramId}`);
  }
</script>

<BackgroundFX />

<div class="relative z-10 flex flex-col items-center min-h-screen px-6 pt-10 pb-24 max-w-[420px] mx-auto">

  <!-- Back + System bar -->
  <div class="w-full flex items-center justify-between mb-6"
    style="animation: fadeInDown 0.5s ease-out both">
    <div class="flex items-center gap-2 ml-auto">
      <span class="w-1.5 h-1.5 rounded-full bg-primary"
        style="animation: statusDot 1.5s ease-in-out infinite; box-shadow: 0 0 6px color-mix(in srgb, var(--color-primary) 90%, transparent)"></span>
      <span class="font-mono text-[0.6rem] tracking-[4px] text-primary/70 uppercase">PROGRAMMES</span>
    </div>
  </div>

  <!-- Title -->
  <h1 class="text-[1.8rem] font-black tracking-[4px] uppercase leading-none italic mb-1"
    style="animation: fadeInDown 0.6s 0.05s ease-out both; text-shadow: 0 0 20px color-mix(in srgb, var(--color-primary) 55%, transparent)">
    Programmes
  </h1>
  <p class="font-mono text-[0.6rem] tracking-[5px] text-dim/60 uppercase mb-7"
    style="animation: systemBoot 0.8s 0.3s ease-out both">
    ◆ Choisis ton chemin ◆
  </p>

  <!-- Goal Filter -->
  <div class="w-full mb-6" style="animation: fadeInUp 0.5s 0.35s ease-out both">
    <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase mb-2.5">◆ Objectif</p>
    <GoalFilter selected={selectedGoal} onselect={(g) => { selectedGoal = g; selectedProgramId = null; }} />
  </div>

  <!-- Programs List -->
  <div class="w-full mb-7" style="animation: fadeInUp 0.5s 0.45s ease-out both">
    <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase mb-2.5">
      ◆ {programs.length} programme{programs.length > 1 ? 's' : ''} disponible{programs.length > 1 ? 's' : ''}
    </p>

    <div class="relative">
      <!-- Corner brackets -->
      <div class="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-primary/50"></div>
      <div class="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-primary/50"></div>
      <div class="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-primary/50"></div>
      <div class="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-primary/50"></div>

      <div class="flex flex-col gap-2">
        {#each programs as program, i (program.id)}
          <div style="animation: slideInLeft 0.4s {0.05 * i + 0.5}s ease-out both">
            <ProgramCard
              {program}
              selected={selectedProgramId === program.id}
              onclick={() => selectProgram(program.id)}
            />
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- View Program Button -->
  {#if selectedProgramId}
    <div class="w-full relative" style="animation: fadeInUp 0.3s ease-out both">
      <div class="absolute inset-0 rounded-[14px] -skew-x-[10deg]"
        style="background: color-mix(in srgb, var(--color-primary) 15%, transparent); animation: pulseGlow 2.5s ease-in-out infinite;"></div>
      <button
        class="relative w-full py-4 bg-primary text-white font-black rounded-[14px] text-[0.95rem] tracking-[5px] uppercase cursor-pointer transition-all
          hover:bg-primary-hover active:scale-[0.97] -skew-x-[10deg]
          shadow-[0_0_25px_color-mix(in srgb, var(--color-primary) 35%, transparent)]"
        onclick={viewProgram}
      >
        <span class="inline-block skew-x-[10deg]">◆ VOIR LE PROGRAMME</span>
      </button>
    </div>
  {/if}

</div>
