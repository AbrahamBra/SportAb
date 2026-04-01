<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { BOSSES, type Boss } from '$lib/game/bosses';
  import { computeLevel, xpForNextLevel, canFightBoss } from '$lib/game/progression';
  import { preloadSounds } from '$lib/game/audio';
  import { initDetector } from '$lib/ai/pose-detector';
  import Stars from '$lib/components/Stars.svelte';
  import XPBar from '$lib/components/XPBar.svelte';
  import BossCard from '$lib/components/BossCard.svelte';
  import ExercisePicker from '$lib/components/ExercisePicker.svelte';

  let { data } = $props();

  // Player state — guest defaults
  let totalXP = $state(0);
  let playerLevel = $derived(computeLevel(totalXP));

  // Selection state
  let selectedBossId = $state<string>('goblin');
  let selectedExercise = $state<string>('pushup');

  // Loading status for model preload
  let modelStatus = $state<string>('');

  function isBossLocked(boss: Boss): boolean {
    return !canFightBoss(playerLevel, boss);
  }

  function selectBoss(boss: Boss): void {
    if (!isBossLocked(boss)) {
      selectedBossId = boss.id;
    }
  }

  function startFight(): void {
    if (!selectedBossId) return;
    goto(`/battle?boss=${selectedBossId}&exercise=${selectedExercise}`);
  }

  onMount(() => {
    // Check onboarding
    const onboarded = localStorage.getItem('pushquest_onboarded');
    if (!onboarded) {
      goto('/onboarding');
      return;
    }

    // Load XP from localStorage for guest users
    if (!data.session) {
      const saved = localStorage.getItem('pushquest_xp');
      if (saved) {
        totalXP = parseInt(saved, 10) || 0;
      }
    }

    // Preload sounds
    preloadSounds();

    // Start preloading TF.js model in background
    initDetector((msg) => {
      modelStatus = msg;
    }).catch(() => {
      modelStatus = 'Model load failed';
    });
  });
</script>

<Stars />

<div class="relative z-10 flex flex-col items-center min-h-screen px-6 pt-12 pb-10 max-w-[420px] mx-auto">
  <!-- Logo -->
  <h1 class="text-[2.6rem] font-black tracking-[4px] uppercase leading-none" style="text-shadow: 0 0 40px rgba(230,57,70,0.7)">
    PushQuest
  </h1>
  <p class="text-xs tracking-[6px] text-primary uppercase mt-1.5 mb-10">Boss Battles</p>

  <!-- XP Bar -->
  <div class="w-full mb-8">
    <XPBar xp={totalXP} level={playerLevel} />
  </div>

  <!-- Boss Selection -->
  <p class="text-[0.6rem] tracking-[5px] text-dim uppercase self-start mb-2.5">Choose Your Boss</p>
  <div class="w-full flex flex-col gap-2.5 mb-7">
    {#each BOSSES as boss}
      <BossCard
        {boss}
        selected={selectedBossId === boss.id}
        locked={isBossLocked(boss)}
        onclick={() => selectBoss(boss)}
      />
    {/each}
  </div>

  <!-- Exercise Picker -->
  <div class="w-full mb-7">
    <p class="text-[0.6rem] tracking-[5px] text-dim uppercase mb-2.5">Exercise</p>
    <ExercisePicker selected={selectedExercise} onselect={(id) => { selectedExercise = id; }} />
  </div>

  <!-- Fight Button -->
  <button
    class="w-full py-4 bg-primary text-white font-black rounded-[14px] text-[0.95rem] tracking-[4px] uppercase cursor-pointer transition-all hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.98]"
    onclick={startFight}
  >
    FIGHT
  </button>

  <!-- Model status indicator -->
  {#if modelStatus && modelStatus !== 'Ready!'}
    <p class="text-xs text-dim tracking-[2px] mt-3">{modelStatus}</p>
  {/if}

  <!-- Profile link -->
  <a href="/profile" class="mt-6 text-xs text-dim tracking-[2px] hover:text-white/70 transition-colors">
    PROFILE
  </a>
</div>
