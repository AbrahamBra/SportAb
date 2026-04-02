<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { EXERCISES, type ExerciseConfig } from '$lib/ai/exercises.config';
  import { createRepChallenge } from '$lib/game/rep-challenge';
  import type { Battle, BattleState } from '$lib/game/battle-engine';
  import { playSound, preloadSounds } from '$lib/game/audio';
  import { saveSessionBattleResult } from '$lib/utils/session-battle-state';
  import CameraDetection from '$lib/components/CameraDetection.svelte';
  import HPBar from '$lib/components/HPBar.svelte';
  import RepCounter from '$lib/components/RepCounter.svelte';
  import FormScoreBar from '$lib/components/FormScoreBar.svelte';

  const exerciseId = $derived(page.url.searchParams.get('exercise') ?? 'pushup');
  const targetReps = $derived(parseInt(page.url.searchParams.get('targetReps') ?? '10', 10));
  const exerciseConfig: ExerciseConfig = $derived(EXERCISES[exerciseId] ?? EXERCISES['pushup']!);

  let battle: Battle | null = $state(null);
  let battleState: BattleState = $state({ bossHP: 0, bossMaxHP: 0, reps: 0, damageDealt: 0, result: 'active', xpEarned: 0, timeElapsedSecs: 0 });
  let isLoading = $state(true);
  let loadingMsg = $state('DEMARRAGE...');
  let cameraActive = $state(false);
  let formScore = $state(0);
  let showRepCounter = $state(false);
  let currentReps = $state(0);
  let shaking = $state(false);
  let repPopTimer: ReturnType<typeof setTimeout> | null = null;

  const isComplete = $derived(battleState.result === 'victory');
  const progress = $derived(targetReps > 0 ? Math.min(100, (battleState.reps / targetReps) * 100) : 0);

  function updateState(): void { if (battle) battleState = battle.getState(); }

  function handleRep(): void {
    if (!battle || !cameraActive) return;
    battle.dealDamage(); updateState();
    currentReps = battleState.reps;
    playSound('rep');
    shaking = true; setTimeout(() => { shaking = false; }, 150);
    showRepCounter = true;
    if (repPopTimer) clearTimeout(repPopTimer);
    repPopTimer = setTimeout(() => { showRepCounter = false; }, 750);

    if (battleState.result === 'victory') {
      cameraActive = false;
      playSound('victory');
      saveSessionBattleResult({ reps: battleState.reps, formScore: formScore / 100 });
      setTimeout(() => goto('/session'), 1500);
    }
  }

  function handleFormUpdate(score: number): void { formScore = score; }

  function handleCameraReady(): void {
    isLoading = false;
    cameraActive = true;
  }

  function handleCameraError(msg: string): void { loadingMsg = msg; }

  function cancelBattle(): void {
    cameraActive = false;
    saveSessionBattleResult({ reps: currentReps, formScore: formScore > 0 ? formScore / 100 : null });
    goto('/session');
  }

  onMount(() => {
    preloadSounds();
    battle = createRepChallenge(targetReps);
    updateState();
    return () => { if (repPopTimer) clearTimeout(repPopTimer); };
  });
</script>

<div class="fixed inset-0 bg-black flex flex-col overflow-hidden {shaking ? 'animate-shake' : ''}">
  <CameraDetection
    {exerciseConfig}
    active={cameraActive}
    paused={false}
    onRep={handleRep}
    onFormUpdate={handleFormUpdate}
    onLoadingMsg={(msg) => { loadingMsg = msg; }}
    onReady={handleCameraReady}
    onError={handleCameraError}
  />

  <!-- Gradient overlays -->
  <div class="absolute top-0 left-0 right-0 h-[160px] bg-gradient-to-b from-black/[0.88] to-transparent pointer-events-none z-[2]"></div>
  <div class="absolute bottom-0 left-0 right-0 h-[160px] bg-gradient-to-t from-black/[0.92] to-transparent pointer-events-none z-[2]"></div>

  <!-- Top HUD -->
  <div class="absolute top-0 left-0 right-0 flex justify-between items-center px-5 z-10"
    style="padding-top: calc(18px + var(--safe-top, 0px))">
    <button class="w-[38px] h-[38px] rounded-full bg-white/[0.12] text-white text-sm flex items-center justify-center"
      onclick={cancelBattle}>✕</button>
    <div class="text-[0.85rem] font-black tracking-[3px] uppercase">{exerciseConfig.name}</div>
    <div class="font-mono text-sm font-bold text-primary">
      {currentReps}/{targetReps}
    </div>
  </div>

  <!-- Progress Bar (replaces HP bar) -->
  <div class="absolute left-5 right-5 z-10" style="top: calc(60px + var(--safe-top, 0px))">
    <div class="relative h-3 bg-white/[0.06] rounded-sm overflow-hidden border border-white/[0.04]">
      <div class="h-full rounded-sm transition-[width] duration-300 ease-out"
        style="width: {progress}%;
               background: linear-gradient(to right, #B8943F, #FFD166);
               box-shadow: 0 0 10px color-mix(in srgb, var(--color-gold) 50%, transparent);"></div>
    </div>
  </div>

  <!-- Rep Counter -->
  <RepCounter count={currentReps} visible={showRepCounter} />

  <!-- Bottom HUD -->
  <div class="absolute left-5 right-5 z-10 flex flex-col gap-2"
    style="bottom: calc(36px + var(--safe-bottom, 0px))">
    <FormScoreBar value={formScore} />
    <p class="text-[0.45rem] text-dim/30 font-mono text-center tracking-[0.5px]">Detection approximative — ajuste tes reps si besoin</p>
    <button class="w-full py-3.5 bg-black/50 border-[1.5px] border-primary/60 text-primary font-bold text-xs tracking-[3px] uppercase rounded-[12px] backdrop-blur-md"
      onclick={cancelBattle}>TERMINER</button>
  </div>

  <!-- Loading Overlay -->
  {#if isLoading}
    <div class="absolute inset-0 bg-background/[0.92] flex flex-col items-center justify-center z-30 gap-[18px]">
      <div class="w-[38px] h-[38px] border-[3px] border-white/[0.08] border-t-primary rounded-full animate-spin"></div>
      <div class="text-xs tracking-[4px] text-dim">{loadingMsg}</div>
      {#if loadingMsg === 'CAMERA REFUSEE' || loadingMsg === 'ECHEC CHARGEMENT'}
        <button class="mt-4 py-3 px-8 bg-primary text-white font-bold rounded-[14px] text-xs tracking-[3px] uppercase hover:bg-primary-hover active:scale-[0.97] transition-all"
          onclick={cancelBattle}>RETOUR</button>
      {/if}
    </div>
  {/if}

  <!-- Completion overlay -->
  {#if isComplete}
    <div class="absolute inset-0 bg-background/[0.85] flex flex-col items-center justify-center z-30 gap-3"
      style="animation: fadeInUp 0.3s ease-out both">
      <span class="text-5xl font-black text-gold"
        style="text-shadow: 0 0 30px color-mix(in srgb, var(--color-gold) 70%, transparent)">✓</span>
      <span class="font-mono text-[0.7rem] tracking-[4px] text-gold/80 uppercase">SERIE COMPLETE</span>
      <span class="font-mono text-2xl font-black text-white">{currentReps} reps</span>
    </div>
  {/if}
</div>
