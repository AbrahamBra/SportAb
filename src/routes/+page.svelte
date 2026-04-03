<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { BOSSES, type Boss } from '$lib/game/bosses';
  import { computeLevel, xpForNextLevel, canFightBoss } from '$lib/game/progression';
  import { preloadSounds } from '$lib/game/audio';
  import { initDetector } from '$lib/ai/pose-detector';
  import { getActiveProgram } from '$lib/utils/session-storage';
  import { loadBattleState, type SavedBattleState } from '$lib/utils/local-storage';
  import { getBoss } from '$lib/game/bosses';
  import { getProgram } from '$lib/data';
  import { getStreaks, getDailyChallenge } from '$lib/game/streaks';
  import { getBoss as getBossInfo } from '$lib/game/bosses';
  import { EXERCISES } from '$lib/ai/exercises.config';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';
  import XPBar from '$lib/components/XPBar.svelte';
  import BossCard from '$lib/components/BossCard.svelte';
  import ExercisePicker from '$lib/components/ExercisePicker.svelte';
  import DiamondIcon from '$lib/components/icons/DiamondIcon.svelte';
  import SwordIcon from '$lib/components/icons/SwordIcon.svelte';
  import PlayIcon from '$lib/components/icons/PlayIcon.svelte';
  import MultiplayerCTA from '$lib/components/MultiplayerCTA.svelte';

  let { data } = $props();

  let totalXP = $state(0);
  let playerLevel = $derived(computeLevel(totalXP));
  let activeProgram = $state<{ name: string } | null>(null);
  let savedBattle = $state<{ bossName: string; bossId: string; exerciseType: string } | null>(null);
  let selectedBossId = $state<string>('goblin');
  let selectedExercise = $state<string>('pushup');
  let modelStatus = $state<string>('');
  let visible = $state(false);
  let streak = $state(0);
  let daily = $state<{ bossId: string; exerciseId: string; bossName: string; exerciseName: string } | null>(null);
  let dailyCompleted = $state(false);
  let countdownText = $state('');

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

    // Check saved battle
    const sb = loadBattleState();
    if (sb) {
      const b = getBoss(sb.bossId);
      if (b) savedBattle = { bossName: b.name, bossId: sb.bossId, exerciseType: sb.exerciseType };
    }

    // Load streaks
    const s = getStreaks();
    streak = s.currentStreak;

    // Load daily challenge
    const dc = getDailyChallenge();
    const dcBoss = getBossInfo(dc.bossId);
    const dcExercise = EXERCISES[dc.exerciseId];
    if (dcBoss && dcExercise) {
      daily = { bossId: dc.bossId, exerciseId: dc.exerciseId, bossName: dcBoss.name, exerciseName: dcExercise.name };
    }

    // Check daily completion
    const dailyCheck = localStorage.getItem('pushquest_daily_completed');
    if (dailyCheck) {
      try {
        const parsed = JSON.parse(dailyCheck);
        const today = new Date().toISOString().split('T')[0];
        if (parsed.date === today) dailyCompleted = true;
      } catch {}
    }

    // Countdown timer
    function updateCountdown() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      countdownText = `${h}h ${m.toString().padStart(2, '0')}m`;
    }
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 60000);

    preloadSounds();
    initDetector((msg) => { modelStatus = msg; }).catch(() => { modelStatus = ''; });

    // Trigger entrance
    requestAnimationFrame(() => { visible = true; });

    return () => { clearInterval(countdownInterval); };
  });
</script>

<BackgroundFX />

<div class="relative z-10 flex flex-col items-center min-h-screen px-6 pt-10 pb-24 max-w-[420px] mx-auto">

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
    <DiamondIcon /> Combats de Boss <DiamondIcon />
  </p>

  <!-- XP Bar -->
  <div class="w-full mb-8" style="animation: fadeInUp 0.5s 0.3s ease-out both">
    <XPBar xp={totalXP} level={playerLevel} />
  </div>

  <!-- MISSION QUOTIDIENNE -->
  {#if daily}
    <div class="w-full mb-4" style="animation: fadeInUp 0.5s 0.31s ease-out both">
      <button
        class="w-full relative overflow-hidden rounded-xl px-4 py-4 text-left transition-all
          {dailyCompleted ? 'bg-surface/70 border-2 border-green-500/30' : 'bg-surface/70 border-2 border-gold/30 hover:border-gold/50'}"
        style={dailyCompleted ? '' : 'animation: missionGlow 2s ease-in-out infinite'}
        onclick={() => goto(`/battle?boss=${daily!.bossId}&exercise=${daily!.exerciseId}`)}
        disabled={dailyCompleted}
      >
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-mono text-[0.55rem] tracking-[3px] uppercase
            {dailyCompleted ? 'text-green-400/70' : 'text-gold/70'}">
            {dailyCompleted ? '✓ MISSION ACCOMPLIE' : '⚡ MISSION QUOTIDIENNE'}
          </span>
          {#if !dailyCompleted}
            <span class="font-mono text-[0.5rem] tracking-[1px] text-dim/40">
              ⏱ {countdownText}
            </span>
          {/if}
        </div>
        <span class="block text-[0.85rem] font-black tracking-[2px] uppercase
          {dailyCompleted ? 'text-green-400/60' : 'text-white/90'}"
          style={dailyCompleted ? '' : 'text-shadow: 0 0 10px rgba(255,209,102,0.3)'}>
          {daily.bossName} · {daily.exerciseName}
        </span>
      </button>
    </div>
  {/if}

  <!-- Streak -->
  <div class="w-full flex gap-2.5 mb-6" style="animation: fadeInUp 0.5s 0.32s ease-out both">
    <div class="flex-1 bg-surface/70 border border-white/[0.06] rounded-lg px-3 py-3 -skew-x-3">
      <div class="skew-x-3 text-center">
        <span class="block text-2xl font-black font-mono {streak > 0 ? 'text-gold' : 'text-dim/40'}"
          style="{streak > 0 ? 'text-shadow: 0 0 12px color-mix(in srgb, var(--color-gold) 50%, transparent)' : ''}"
        >{streak > 0 ? '🔥' : '💀'} {streak}</span>
        <span class="text-[0.5rem] text-dim/50 font-mono tracking-[2px] uppercase">
          {streak === 0 ? 'Rallume la flamme' : streak === 1 ? 'jour' : 'jours'}
        </span>
      </div>
    </div>
  </div>

  <!-- Duel CTA -->
  <div class="w-full mb-4" style="animation: fadeInUp 0.5s 0.33s ease-out both">
    <a
      href="/duel"
      class="w-full relative group block"
    >
      <div class="absolute inset-0 rounded-[14px] -skew-x-[8deg]"
        style="background: rgba(139,92,246,0.1); animation: pulseGlow 2.5s ease-in-out infinite;"></div>
      <div class="relative w-full py-3.5 bg-purple-500/15 border-2 border-purple-500/40 text-purple-400 font-black rounded-[14px] text-[0.8rem] tracking-[4px] uppercase text-center
        hover:bg-purple-500/25 active:scale-[0.97] transition-all -skew-x-[8deg]"
        style="text-shadow: 0 0 12px rgba(139,92,246,0.5)">
        <span class="inline-block skew-x-[8deg]">⚔️ DUEL 1v1</span>
      </div>
    </a>
  </div>

  {#if !data.session}
    <MultiplayerCTA />
  {/if}

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
          <span class="inline-block skew-x-[8deg]"><PlayIcon /> CONTINUER — {activeProgram.name}</span>
        </div>
      </button>
    </div>
  {/if}

  <!-- Battle Resume -->
  {#if savedBattle}
    <div class="w-full mb-4" style="animation: fadeInUp 0.5s 0.33s ease-out both">
      <button
        class="w-full relative group"
        onclick={() => goto(`/battle?boss=${savedBattle!.bossId}&exercise=${savedBattle!.exerciseType}&resume=true`)}
      >
        <div class="absolute inset-0 rounded-[14px] -skew-x-[8deg]"
          style="background: rgba(230,57,70,0.1); animation: pulseGlow 2.5s ease-in-out infinite;"></div>
        <div class="relative w-full py-3 bg-primary/15 border-2 border-primary/40 text-primary font-black rounded-[14px] text-[0.75rem] tracking-[3px] uppercase
          hover:bg-primary/25 active:scale-[0.97] transition-all -skew-x-[8deg]"
          style="text-shadow: 0 0 10px rgba(230,57,70,0.4)">
          <span class="inline-block skew-x-[8deg]"><SwordIcon /> REPRENDRE — {savedBattle.bossName}</span>
        </div>
      </button>
    </div>
  {/if}

  <!-- Boss Selection -->
  <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase self-start mb-2.5"
    style="animation: fadeInUp 0.5s 0.35s ease-out both">
    <DiamondIcon /> Choisis ton Boss
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
    <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase mb-2.5"><DiamondIcon /> Exercice</p>
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
      <span class="inline-block skew-x-[10deg]"><SwordIcon /> COMBATTRE</span>
    </button>
  </div>

  <!-- Model status -->
  {#if modelStatus && modelStatus !== 'Pret !'}
    <p class="text-[0.6rem] font-mono text-dim/60 tracking-[2px] mt-3"
      style="animation: systemBoot 0.5s ease-out both">{modelStatus}</p>
  {/if}

</div>

<style>
  @keyframes missionGlow {
    0%, 100% { box-shadow: 0 0 15px rgba(255,209,102,0.1), inset 0 0 15px rgba(255,209,102,0.03); }
    50% { box-shadow: 0 0 25px rgba(255,209,102,0.2), inset 0 0 25px rgba(255,209,102,0.06); }
  }
</style>
