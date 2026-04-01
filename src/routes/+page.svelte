<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { BOSSES, type Boss } from '$lib/game/bosses';
  import { computeLevel, xpForNextLevel, canFightBoss } from '$lib/game/progression';
  import { preloadSounds } from '$lib/game/audio';
  import { initDetector } from '$lib/ai/pose-detector';
  import { getActiveProgram } from '$lib/utils/session-storage';
  import { getProgram } from '$lib/data';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';
  import XPBar from '$lib/components/XPBar.svelte';
  import BossCard from '$lib/components/BossCard.svelte';
  import ExercisePicker from '$lib/components/ExercisePicker.svelte';

  let { data } = $props();

  let totalXP = $state(0);
  let playerLevel = $derived(computeLevel(totalXP));
  let activeProgram = $state<{ name: string } | null>(null);
  let selectedBossId = $state<string>('goblin');
  let selectedExercise = $state<string>('pushup');
  let modelStatus = $state<string>('');
  let visible = $state(false);

  function isBossLocked(boss: Boss): boolean {
    return !canFightBoss(playerLevel, boss);
  }

  function selectBoss(boss: Boss): void {
    if (!isBossLocked(boss)) selectedBossId = boss.id;
  }

  function startFight(): void {
    if (!selectedBossId) return;
    goto(`/battle?boss=${selectedBossId}&exercise=${selectedExercise}`);
  }

  onMount(() => {
    const onboarded = localStorage.getItem('pushquest_onboarded');
    if (!onboarded) { goto('/onboarding'); return; }

    if (!data.session) {
      const saved = localStorage.getItem('pushquest_xp');
      if (saved) totalXP = parseInt(saved, 10) || 0;
    }

    // Check active program
    const ap = getActiveProgram();
    if (ap) {
      const prog = getProgram(ap.programId);
      if (prog) activeProgram = { name: prog.name };
    }

    preloadSounds();
    initDetector((msg) => { modelStatus = msg; }).catch(() => { modelStatus = ''; });

    // Trigger entrance
    requestAnimationFrame(() => { visible = true; });
  });
</script>

<BackgroundFX />

<div class="relative z-10 flex flex-col items-center min-h-screen px-6 pt-10 pb-10 max-w-[420px] mx-auto">

  <!-- System status bar -->
  <div class="w-full flex items-center gap-2 mb-8 self-start"
    style="animation: fadeInDown 0.5s ease-out both">
    <span class="w-1.5 h-1.5 rounded-full bg-primary"
      style="animation: statusDot 1.5s ease-in-out infinite; box-shadow: 0 0 6px rgba(230,57,70,0.9)"></span>
    <span class="font-mono text-[0.6rem] tracking-[4px] text-primary/70 uppercase">SYSTEM_ONLINE · v1.0</span>
  </div>

  <!-- Logo -->
  <h1 class="text-[2.8rem] font-black tracking-[5px] uppercase leading-none italic"
    style="animation: fadeInDown 0.6s 0.05s ease-out both; text-shadow: 0 0 20px rgba(230,57,70,0.55), 0 0 50px rgba(230,57,70,0.25); animation: glitchRed 8s ease-in-out infinite, fadeInDown 0.6s 0.05s ease-out both">
    PushQuest
  </h1>
  <p class="font-mono text-[0.65rem] tracking-[7px] text-primary uppercase mt-1.5 mb-9"
    style="animation: systemBoot 0.8s 0.4s ease-out both">
    ◆ Combats de Boss ◆
  </p>

  <!-- XP Bar -->
  <div class="w-full mb-8" style="animation: fadeInUp 0.5s 0.3s ease-out both">
    <XPBar xp={totalXP} level={playerLevel} />
  </div>

  <!-- Active Program -->
  {#if activeProgram}
    <div class="w-full mb-6" style="animation: fadeInUp 0.5s 0.32s ease-out both">
      <button
        class="w-full relative group"
        onclick={() => goto('/session')}
      >
        <div class="absolute inset-0 rounded-[14px] -skew-x-[8deg]"
          style="background: rgba(255,209,102,0.1); animation: pulseGlowGold 2.5s ease-in-out infinite;"></div>
        <div class="relative w-full py-3.5 bg-gold/15 border-2 border-gold/40 text-gold font-black rounded-[14px] text-[0.8rem] tracking-[4px] uppercase
          hover:bg-gold/25 active:scale-[0.97] transition-all -skew-x-[8deg]"
          style="text-shadow: 0 0 12px rgba(255,209,102,0.5)">
          <span class="inline-block skew-x-[8deg]">▶ CONTINUER — {activeProgram.name}</span>
        </div>
      </button>
    </div>
  {/if}

  <!-- Boss Selection -->
  <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase self-start mb-2.5"
    style="animation: fadeInUp 0.5s 0.35s ease-out both">
    ◆ Choisis ton Boss
  </p>
  <div class="relative w-full mb-7" style="animation: fadeInUp 0.5s 0.4s ease-out both">
    <!-- Corner brackets -->
    <div class="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-primary/50"></div>
    <div class="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-primary/50"></div>
    <div class="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-primary/50"></div>
    <div class="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-primary/50"></div>

    <div class="flex flex-col gap-2">
      {#each BOSSES as boss, i}
        <div style="animation: slideInLeft 0.4s {0.05 * i + 0.45}s ease-out both">
          <BossCard
            {boss}
            selected={selectedBossId === boss.id}
            locked={isBossLocked(boss)}
            onclick={() => selectBoss(boss)}
          />
        </div>
      {/each}
    </div>
  </div>

  <!-- Exercise Picker -->
  <div class="w-full mb-7" style="animation: fadeInUp 0.5s 0.65s ease-out both">
    <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase mb-2.5">◆ Exercice</p>
    <ExercisePicker selected={selectedExercise} onselect={(id) => { selectedExercise = id; }} />
  </div>

  <!-- Fight Button -->
  <div class="w-full relative" style="animation: fadeInUp 0.5s 0.75s ease-out both">
    <!-- Glow layer -->
    <div class="absolute inset-0 rounded-[14px] -skew-x-[10deg]"
      style="background: rgba(230,57,70,0.15); animation: pulseGlow 2.5s ease-in-out infinite;"></div>
    <button
      class="relative w-full py-4 bg-primary text-white font-black rounded-[14px] text-[0.95rem] tracking-[5px] uppercase cursor-pointer transition-all
        hover:bg-primary-hover active:scale-[0.97] -skew-x-[10deg]
        shadow-[0_0_25px_rgba(230,57,70,0.35)]"
      onclick={startFight}
    >
      <span class="inline-block skew-x-[10deg]">⚔ COMBATTRE</span>
    </button>
  </div>

  <!-- Model status -->
  {#if modelStatus && modelStatus !== 'Ready!'}
    <p class="text-[0.6rem] font-mono text-dim/60 tracking-[2px] mt-3"
      style="animation: systemBoot 0.5s ease-out both">{modelStatus}</p>
  {/if}

  <!-- Nav links -->
  <div class="flex gap-4 flex-wrap justify-center mt-7" style="animation: fadeInUp 0.5s 0.9s ease-out both">
    <a href="/programs"
      class="font-mono text-[0.6rem] text-dim/60 tracking-[4px] hover:text-primary/70 transition-colors uppercase">
      ◆ PROGRAMMES ◆
    </a>
    <a href="/friends"
      class="font-mono text-[0.6rem] text-dim/60 tracking-[4px] hover:text-gold/70 transition-colors uppercase">
      ◆ AMIS ◆
    </a>
    <a href="/profile"
      class="font-mono text-[0.6rem] text-dim/60 tracking-[4px] hover:text-primary/70 transition-colors uppercase">
      ◆ PROFILE ◆
    </a>
  </div>
</div>
