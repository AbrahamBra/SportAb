<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { getBoss, type Boss } from '$lib/game/bosses';
  import { createBattle, type BattleState, type Battle } from '$lib/game/battle-engine';
  import { EXERCISES, type ExerciseConfig } from '$lib/ai/exercises.config';
  import { playSound, playSoundPitched, preloadSounds, vibrate } from '$lib/game/audio';
  import { computeLevel } from '$lib/game/progression';
  import { onVisibilityChange } from '$lib/utils/visibility';
  import { saveBattleState, loadBattleState, clearBattleState } from '$lib/utils/local-storage';
  import { getBossSprite, type AnimationType } from '$lib/game/sprite-config';
  import CameraDetection from '$lib/components/CameraDetection.svelte';
  import SpriteAnimator from '$lib/components/SpriteAnimator.svelte';
  import HPBar from '$lib/components/HPBar.svelte';
  import RepCounter from '$lib/components/RepCounter.svelte';
  import FormScoreBar from '$lib/components/FormScoreBar.svelte';
  import VictoryScreen from '$lib/components/VictoryScreen.svelte';
  import DefeatScreen from '$lib/components/DefeatScreen.svelte';

  // URL params
  const bossId = $derived(page.url.searchParams.get('boss') ?? 'goblin');
  const exerciseType = $derived(page.url.searchParams.get('exercise') ?? 'pushup');
  const isResume = $derived(page.url.searchParams.get('resume') === 'true');

  // Boss and exercise config
  const boss: Boss = $derived(getBoss(bossId) ?? getBoss('goblin')!);
  const exerciseConfig: ExerciseConfig = $derived(EXERCISES[exerciseType] ?? EXERCISES['pushup']!);

  // Core state
  let battle: Battle | null = $state(null);
  let battleState: BattleState = $state({
    bossHP: 0, bossMaxHP: 0, reps: 0, damageDealt: 0,
    result: 'active', xpEarned: 0, timeElapsedSecs: 0,
  });

  // UI state
  let isLoading = $state(true);
  let loadingMsg = $state('DEMARRAGE...');
  let isPaused = $state(false);
  let secsLeft = $state(0);
  let formScore = $state(0);
  let showRepCounter = $state(false);
  let currentReps = $state(0);
  let countdown = $state(0);
  let showLevelUp = $state(false);
  let shaking = $state(false);
  let cameraActive = $state(false);
  let levelBefore = 0;

  // === JUICE SYSTEMS ===

  // Hit stop (freeze frame)
  let hitStopped = $state(false);

  // Combo system
  let comboCount = $state(0);
  let lastRepTime = 0;
  const COMBO_WINDOW_MS = 3000; // 3s between reps to keep combo
  const comboTier = $derived(
    comboCount >= 15 ? 4 : comboCount >= 10 ? 3 : comboCount >= 5 ? 2 : comboCount >= 3 ? 1 : 0
  );
  const comboLabel = $derived(
    comboTier === 4 ? 'LEGENDARY' : comboTier === 3 ? 'UNSTOPPABLE' : comboTier === 2 ? 'ON FIRE' : comboTier === 1 ? 'COMBO' : ''
  );
  const comboColor = $derived(
    comboTier >= 3 ? 'text-gold' : comboTier === 2 ? 'text-orange-400' : 'text-primary'
  );

  // Damage numbers
  let damagePopups: Array<{ id: number; x: number; y: number; value: string; color: string }> = $state([]);
  let popupId = 0;

  // Mid-combat messages
  let battleMessage = $state('');
  let battleMessageTimer: ReturnType<typeof setTimeout> | null = null;
  let shownMessages = new Set<string>();

  // Boss intro
  let showBossIntro = $state(false);

  // Damage flash overlay
  let showDamageFlash = $state(false);

  // Boss sprite
  const bossSprite = $derived(getBossSprite(bossId));
  let bossAnim: AnimationType = $state('idle');
  let animTimer: ReturnType<typeof setTimeout> | null = null;

  function playBossAnim(anim: AnimationType, durationMs: number = 600): void {
    bossAnim = anim;
    if (animTimer) clearTimeout(animTimer);
    animTimer = setTimeout(() => { bossAnim = 'idle'; }, durationMs);
  }

  // Random boss attack (every 8-15s)
  let bossAttackHandle: ReturnType<typeof setInterval> | null = null;

  // Handles
  let timerHandle: ReturnType<typeof setInterval> | null = null;
  let saveHandle: ReturnType<typeof setInterval> | null = null;
  let repPopTimer: ReturnType<typeof setTimeout> | null = null;

  // Timer display
  const timerDisplay = $derived(() => {
    const m = Math.floor(secsLeft / 60);
    const s = secsLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });
  const timerWarning = $derived(secsLeft <= 30 && secsLeft > 0);

  // Battle result checks
  const isVictory = $derived(battleState.result === 'victory');
  const isDefeat = $derived(battleState.result === 'defeat' || battleState.result === 'fled');
  const isActive = $derived(battleState.result === 'active');

  function updateBattleState(): void {
    if (battle) battleState = battle.getState();
  }

  // --- Juice helpers ---
  function showBattleMsg(msg: string, durationMs: number = 1500): void {
    battleMessage = msg;
    if (battleMessageTimer) clearTimeout(battleMessageTimer);
    battleMessageTimer = setTimeout(() => { battleMessage = ''; }, durationMs);
  }

  function spawnDamageNumber(value: string, color: string = 'text-gold'): void {
    const x = 40 + Math.random() * 20; // 40-60% horizontal
    const y = 20 + Math.random() * 10; // 20-30% vertical
    const id = popupId++;
    damagePopups = [...damagePopups, { id, x, y, value, color }];
    setTimeout(() => {
      damagePopups = damagePopups.filter(p => p.id !== id);
    }, 800);
  }

  function checkMilestoneMessages(): void {
    const pct = battleState.bossHP / battleState.bossMaxHP;
    if (pct <= 0.1 && pct > 0 && !shownMessages.has('10')) {
      shownMessages.add('10');
      showBattleMsg('FINISH HIM!', 2000);
    } else if (pct <= 0.25 && !shownMessages.has('25')) {
      shownMessages.add('25');
      showBattleMsg('IL FAIBLIT!', 1500);
    } else if (pct <= 0.5 && !shownMessages.has('50')) {
      shownMessages.add('50');
      showBattleMsg('MI-COMBAT — TIENS BON!', 1500);
    }
  }

  // --- Camera callbacks ---
  function handleRep(): void {
    if (!battle || !cameraActive || hitStopped) return;
    battle.dealDamage();
    updateBattleState();
    currentReps = battleState.reps;

    // 1. Pitched sound (variety)
    playSoundPitched('rep', [0.85, 1.15]);

    // 2. Haptic feedback (Android)
    vibrate(comboTier >= 2 ? [30, 20, 30] : 40);

    // 3. Hit stop — freeze 50ms
    hitStopped = true;
    setTimeout(() => { hitStopped = false; }, 50);

    // 4. Boss hurt animation
    playBossAnim('hurt', 400);

    // 5. Screen shake — intensity scales with combo
    shaking = true;
    setTimeout(() => { shaking = false; }, comboTier >= 2 ? 200 : 150);

    // 6. Damage flash
    showDamageFlash = true;
    setTimeout(() => { showDamageFlash = false; }, 100);

    // 7. Combo system
    const now = Date.now();
    if (now - lastRepTime < COMBO_WINDOW_MS) {
      comboCount++;
    } else {
      comboCount = 1;
    }
    lastRepTime = now;

    // 8. Damage number popup
    const isCritical = comboTier >= 2;
    const dmgValue = isCritical ? `-${1 + comboTier}` : '-1';
    spawnDamageNumber(dmgValue, isCritical ? 'text-gold' : 'text-white');

    // 9. Rep pop
    showRepCounter = true;
    if (repPopTimer) clearTimeout(repPopTimer);
    repPopTimer = setTimeout(() => { showRepCounter = false; }, 750);

    // 10. Milestone messages
    checkMilestoneMessages();

    if (battleState.result === 'victory') {
      bossAnim = 'death';
      showBattleMsg('VICTOIRE!', 3000);
      endBattle('victory');
    }
  }

  function handleFormUpdate(score: number): void {
    formScore = score;
  }

  function handleCameraReady(): void {
    isLoading = false;
    levelBefore = computeLevel(parseInt(localStorage.getItem('pushquest_xp') ?? '0', 10));

    // Resume: skip intro + countdown
    if (isResume) {
      const saved = loadBattleState();
      if (saved && saved.bossId === bossId) {
        for (let i = 0; i < saved.reps; i++) battle?.dealDamage();
        updateBattleState();
        currentReps = saved.reps;
        secsLeft = boss.timeLimitSecs - saved.timeElapsedSecs;
        cameraActive = true;
        startTimer();
        clearBattleState();
        return;
      }
    }

    // Boss intro (2s) → then countdown
    showBossIntro = true;
    setTimeout(() => {
      showBossIntro = false;

      // 3-2-1 countdown
      countdown = 3;
      const countdownInterval = setInterval(() => {
        countdown--;
        playSound('countdown');
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          cameraActive = true;
          startTimer();
        }
      }, 1000);
    }, 2000);
  }

  function handleCameraError(msg: string): void {
    loadingMsg = msg;
  }

  // --- Timer ---
  function startTimer(): void {
    if (!secsLeft) secsLeft = boss.timeLimitSecs;
    timerHandle = setInterval(() => {
      if (isPaused || !cameraActive) return;
      secsLeft--;
      if (battle) { battle.tick(); updateBattleState(); }
      if (secsLeft <= 30 && secsLeft > 0) playSound('warning');
      if (secsLeft <= 0) endBattle('defeat');
    }, 1000);

    // Random boss attacks (visual only, every 8-15s)
    bossAttackHandle = setInterval(() => {
      if (isPaused || !cameraActive || battleState.result !== 'active') return;
      playBossAnim('attack', 800);
    }, 8000 + Math.random() * 7000);

    // Auto-save
    saveHandle = setInterval(() => {
      if (!battle || !cameraActive) return;
      const s = battle.getState();
      saveBattleState({ bossId: boss.id, exerciseType, bossHP: s.bossHP, reps: s.reps, timeElapsedSecs: s.timeElapsedSecs, savedAt: Date.now() });
    }, 5000);
  }

  function endBattle(result: 'victory' | 'defeat'): void {
    cameraActive = false;
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    if (saveHandle) { clearInterval(saveHandle); saveHandle = null; }
    clearBattleState();

    if (result === 'victory') {
      if (battle) updateBattleState();
      playSound('victory');
      const earned = battleState.xpEarned;
      const currentXP = parseInt(localStorage.getItem('pushquest_xp') ?? '0', 10);
      const newXP = currentXP + earned;
      localStorage.setItem('pushquest_xp', String(newXP));
      const levelAfter = computeLevel(newXP);
      if (levelAfter > levelBefore) {
        showLevelUp = true; playSound('levelup');
        setTimeout(() => { showLevelUp = false; }, 3000);
      }
      saveBattleHistory('victory');
    } else {
      if (battle) { battle.timeUp(); updateBattleState(); }
      playSound('defeat');
      saveBattleHistory('defeat');
    }
  }

  function saveBattleHistory(result: string): void {
    try {
      const history = JSON.parse(localStorage.getItem('pushquest_history') ?? '[]');
      history.unshift({ bossId: boss.id, bossName: boss.name, result, reps: battleState.reps, date: new Date().toISOString() });
      if (history.length > 50) history.length = 50;
      localStorage.setItem('pushquest_history', JSON.stringify(history));
    } catch {}
  }

  function pauseGame(): void { isPaused = true; }
  function resumeGame(): void { isPaused = false; }

  function fleeGame(): void {
    cameraActive = false;
    if (battle) battle.flee();
    updateBattleState();
    cleanup(); goto('/');
  }

  function closeBattle(): void { cameraActive = false; cleanup(); goto('/'); }
  function handleVictoryClaim(): void { cleanup(); goto('/'); }
  function handleRetry(): void { cleanup(); goto(`/battle?boss=${bossId}&exercise=${exerciseType}`); }
  function handleEasierBoss(): void { cleanup(); goto('/'); }

  function cleanup(): void {
    cameraActive = false;
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    if (saveHandle) { clearInterval(saveHandle); saveHandle = null; }
    if (repPopTimer) { clearTimeout(repPopTimer); repPopTimer = null; }
    if (bossAttackHandle) { clearInterval(bossAttackHandle); bossAttackHandle = null; }
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    if (battleMessageTimer) { clearTimeout(battleMessageTimer); battleMessageTimer = null; }
  }

  onMount(() => {
    preloadSounds();
    battle = createBattle(boss);
    updateBattleState();
    secsLeft = boss.timeLimitSecs;

    const visCleanup = onVisibilityChange(
      () => { if (cameraActive) pauseGame(); },
      () => {},
    );

    return () => { cleanup(); visCleanup(); };
  });
</script>

<div class="fixed inset-0 bg-black flex flex-col overflow-hidden {shaking ? 'animate-shake' : ''}">
  <!-- Camera Detection Component -->
  <CameraDetection
    {exerciseConfig}
    active={cameraActive}
    paused={isPaused}
    onRep={handleRep}
    onFormUpdate={handleFormUpdate}
    onLoadingMsg={(msg) => { loadingMsg = msg; }}
    onReady={handleCameraReady}
    onError={handleCameraError}
  />

  <!-- Damage Flash Overlay -->
  {#if showDamageFlash}
    <div class="absolute inset-0 z-[4] pointer-events-none"
      style="background: radial-gradient(circle at 50% 30%, rgba(230,57,70,0.3), transparent 70%);
             animation: damageFlash 0.15s ease-out both;"></div>
  {/if}

  <!-- Boss Sprite -->
  {#if bossSprite && isActive && !isLoading && countdown <= 0}
    <div class="absolute top-[15%] left-1/2 -translate-x-1/2 z-[3] flex items-center justify-center"
      style="filter: drop-shadow(0 0 20px rgba(230,57,70,0.4)) drop-shadow(0 4px 12px rgba(0,0,0,0.6));
             transition: filter 0.15s, transform 0.1s;
             {hitStopped ? 'filter: brightness(3) drop-shadow(0 0 30px white);' : ''}
             {bossAnim === 'hurt' ? 'transform: translate(-50%, 0) scale(0.95);' : ''}
             {bossAnim === 'death' ? 'opacity: 0.6;' : ''}">
      <SpriteAnimator
        sprite={bossSprite}
        animation={bossAnim}
        class="max-h-[35vh]"
      />
    </div>
  {/if}

  <!-- Damage Numbers -->
  {#each damagePopups as popup (popup.id)}
    <div class="absolute z-[12] pointer-events-none font-black font-mono {popup.color}"
      style="left: {popup.x}%; top: {popup.y}%;
             font-size: {popup.value.length > 2 ? '2rem' : '1.5rem'};
             text-shadow: 0 0 12px currentColor, 0 2px 4px rgba(0,0,0,0.8);
             animation: dmgPop 0.8s ease-out both;">
      {popup.value}
    </div>
  {/each}

  <!-- Combo Display -->
  {#if comboCount >= 3 && isActive}
    <div class="absolute top-[42%] right-4 z-[11] pointer-events-none text-right"
      style="animation: fadeInUp 0.3s ease-out both;">
      <div class="font-black text-3xl font-mono {comboColor}"
        style="text-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
               animation: repPop 0.4s ease-out both;"
        >{comboCount}x</div>
      <div class="text-[0.5rem] tracking-[4px] font-bold {comboColor} uppercase opacity-80"
        >{comboLabel}</div>
    </div>
  {/if}

  <!-- Battle Messages (mid-combat) -->
  {#if battleMessage && isActive}
    <div class="absolute top-[48%] left-0 right-0 z-[13] pointer-events-none flex justify-center"
      style="animation: fadeInUp 0.4s ease-out both;">
      <div class="px-6 py-2 bg-black/60 backdrop-blur-sm border border-primary/40 rounded-lg">
        <span class="font-black text-lg tracking-[5px] text-primary uppercase"
          style="text-shadow: 0 0 20px rgba(230,57,70,0.8);">{battleMessage}</span>
      </div>
    </div>
  {/if}

  <!-- Gradient overlays -->
  <div class="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-black/[0.88] to-transparent pointer-events-none z-[2]"></div>
  <div class="absolute bottom-0 left-0 right-0 h-[220px] bg-gradient-to-t from-black/[0.92] to-transparent pointer-events-none z-[2]"></div>

  {#if isActive || isLoading}
    <!-- Top HUD -->
    <div class="absolute top-0 left-0 right-0 flex justify-between items-center px-5 z-10"
      style="padding-top: calc(18px + var(--safe-top, 0px))">
      <button class="w-[38px] h-[38px] rounded-full bg-white/[0.12] border-none text-white text-sm cursor-pointer flex items-center justify-center"
        onclick={closeBattle}>✕</button>
      <div class="text-[1.05rem] font-black tracking-[5px] uppercase">{boss.name}</div>
      <div class="font-mono text-[0.95rem] font-bold tracking-[1px] flex items-center gap-1.5 {timerWarning ? 'text-primary' : 'text-white'}">
        ⏱ {timerDisplay()}
      </div>
    </div>

    <!-- HP Bar -->
    <div class="absolute left-5 right-5 z-10" style="top: calc(60px + var(--safe-top, 0px))">
      <div class="relative">
        <div class="absolute -top-2 -left-2 w-6 h-6 border-t border-l border-primary/40"></div>
        <div class="absolute -top-2 -right-2 w-6 h-6 border-t border-r border-primary/40"></div>
        <div class="absolute -bottom-2 -left-2 w-6 h-6 border-b border-l border-primary/40"></div>
        <div class="absolute -bottom-2 -right-2 w-6 h-6 border-b border-r border-primary/40"></div>
        <HPBar current={battleState.bossHP} max={battleState.bossMaxHP} />
      </div>
    </div>

    <!-- Rep Counter -->
    <RepCounter count={currentReps} visible={showRepCounter} />

    <!-- Bottom HUD -->
    <div class="absolute left-5 right-5 z-10 flex flex-col gap-2.5"
      style="bottom: calc(36px + var(--safe-bottom, 0px))">
      <FormScoreBar value={formScore} />
      <p class="text-[0.45rem] text-dim/30 font-mono text-center tracking-[0.5px]">Detection approximative — ajuste tes reps si besoin</p>
      <div class="flex gap-2.5">
        <button class="flex-1 py-3.5 bg-black/50 border-[1.5px] border-white/[0.18] text-white font-bold text-xs tracking-[3px] uppercase rounded-[12px] cursor-pointer backdrop-blur-md"
          onclick={pauseGame}>PAUSE</button>
        <button class="flex-1 py-3.5 bg-black/50 border-[1.5px] border-primary/60 text-primary font-bold text-xs tracking-[3px] uppercase rounded-[12px] cursor-pointer backdrop-blur-md"
          onclick={fleeGame}>FUIR</button>
      </div>
    </div>
  {/if}

  <!-- Loading Overlay -->
  {#if isLoading}
    <div class="absolute inset-0 bg-[rgba(8,8,15,0.92)] flex flex-col items-center justify-center z-30 gap-[18px] loading-grid">
      <div class="w-[38px] h-[38px] border-[3px] border-white/[0.08] border-t-primary rounded-full animate-spin"></div>
      <div class="text-xs tracking-[4px] text-dim">{loadingMsg}</div>
      {#if loadingMsg === 'CAMERA REFUSEE' || loadingMsg === 'ECHEC CHARGEMENT'}
        <button class="mt-4 py-3 px-8 bg-primary text-white font-bold rounded-[14px] text-xs tracking-[3px] uppercase hover:bg-primary-hover active:scale-[0.97] transition-all"
          onclick={closeBattle}>RETOUR</button>
      {/if}
    </div>
  {/if}

  <!-- Boss Intro Overlay -->
  {#if showBossIntro}
    <div class="absolute inset-0 bg-[rgba(8,8,15,0.95)] flex flex-col items-center justify-center z-[29] gap-4">
      {#if bossSprite}
        <div style="animation: fadeInUp 0.6s ease-out both;
                    filter: drop-shadow(0 0 40px rgba(230,57,70,0.6));">
          <SpriteAnimator sprite={bossSprite} animation="idle" class="max-h-[30vh]" />
        </div>
      {/if}
      <div style="animation: fadeInUp 0.6s ease-out 0.3s both;">
        <span class="font-mono text-[0.6rem] tracking-[6px] text-primary/60 uppercase">BOSS FIGHT</span>
      </div>
      <div style="animation: fadeInUp 0.6s ease-out 0.5s both;">
        <span class="text-4xl font-black tracking-[8px] uppercase"
          style="text-shadow: 0 0 30px rgba(230,57,70,0.8), 0 0 60px rgba(230,57,70,0.4);
                 animation: glitchRed 3s ease-in-out infinite;">{boss.name}</span>
      </div>
      <div style="animation: fadeInUp 0.6s ease-out 0.7s both;">
        <span class="font-mono text-xs text-dim tracking-[3px]">{boss.hp} HP · {Math.floor(boss.timeLimitSecs / 60)} MIN</span>
      </div>
    </div>
  {/if}

  <!-- Countdown Overlay -->
  {#if countdown > 0 && !isLoading && !showBossIntro}
    <div class="absolute inset-0 bg-[rgba(8,8,15,0.85)] flex items-center justify-center z-[28]">
      <span class="font-mono text-8xl font-black text-primary"
        style="text-shadow: 0 0 40px rgba(230,57,70,0.8), 0 0 80px rgba(230,57,70,0.4);
               animation: repPop 0.8s ease-out both">{countdown}</span>
    </div>
  {/if}

  <!-- Level Up Overlay -->
  {#if showLevelUp}
    <div class="absolute top-[15%] left-0 right-0 flex flex-col items-center z-[35] pointer-events-none"
      style="animation: fadeInUp 0.5s ease-out both">
      <span class="font-mono text-[0.6rem] tracking-[6px] text-gold/80 uppercase mb-2">NIVEAU SUPERIEUR</span>
      <span class="text-5xl font-black text-gold"
        style="text-shadow: 0 0 30px rgba(255,209,102,0.8), 0 0 60px rgba(255,209,102,0.4);
               animation: repPop 0.8s ease-out both">LEVEL UP!</span>
    </div>
  {/if}

  <!-- Pause Overlay -->
  {#if isPaused && isActive}
    <div class="absolute inset-0 bg-[rgba(8,8,15,0.9)] flex flex-col items-center justify-center z-[25] gap-4">
      <h2 class="text-3xl font-black tracking-[8px]">EN PAUSE</h2>
      <button class="py-3 px-9 bg-primary text-white font-black rounded-[14px] tracking-[4px] uppercase hover:bg-primary-hover active:scale-[0.98] transition-all"
        onclick={resumeGame}>REPRENDRE</button>
      <button class="py-3 px-9 bg-transparent border-[1.5px] border-white/25 text-white font-bold text-xs tracking-[3px] rounded-[12px] cursor-pointer"
        onclick={closeBattle}>QUITTER</button>
    </div>
  {/if}

  <!-- Victory Screen -->
  {#if isVictory}
    <div class="absolute inset-0 bg-background/95 z-30 flex items-center justify-center overflow-y-auto">
      <VictoryScreen state={battleState} {boss} onClaim={handleVictoryClaim} />
    </div>
  {/if}

  <!-- Defeat Screen -->
  {#if isDefeat}
    <div class="absolute inset-0 bg-background/95 z-30 flex items-center justify-center overflow-y-auto">
      <DefeatScreen state={battleState} {boss} onRetry={handleRetry} onEasier={handleEasierBoss} />
    </div>
  {/if}
</div>

<style>
  .loading-grid {
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  @keyframes dmgPop {
    0%   { opacity: 1; transform: translateY(0) scale(1.3); }
    60%  { opacity: 1; transform: translateY(-40px) scale(1); }
    100% { opacity: 0; transform: translateY(-70px) scale(0.8); }
  }
</style>
