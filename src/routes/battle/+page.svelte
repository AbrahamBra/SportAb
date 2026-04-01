<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { getBoss, type Boss } from '$lib/game/bosses';
  import { createBattle, type BattleState, type Battle } from '$lib/game/battle-engine';
  import { EXERCISES, type ExerciseConfig } from '$lib/ai/exercises.config';
  import { initDetector, detectPose, isDetectorReady } from '$lib/ai/pose-detector';
  import { createExerciseDetector, type ExerciseDetector, type Keypoint } from '$lib/ai/exercise-detector';
  import { playSound, preloadSounds } from '$lib/game/audio';
  import { computeLevel } from '$lib/game/progression';
  import { onVisibilityChange } from '$lib/utils/visibility';
  import { saveBattleState, clearBattleState } from '$lib/utils/local-storage';
  import HPBar from '$lib/components/HPBar.svelte';
  import RepCounter from '$lib/components/RepCounter.svelte';
  import FormScoreBar from '$lib/components/FormScoreBar.svelte';
  import VictoryScreen from '$lib/components/VictoryScreen.svelte';
  import DefeatScreen from '$lib/components/DefeatScreen.svelte';

  // MoveNet skeleton connections (17 keypoints)
  const CONNECTIONS: [string, string][] = [
    ['nose','left_eye'],['nose','right_eye'],
    ['left_eye','left_ear'],['right_eye','right_ear'],
    ['left_shoulder','right_shoulder'],
    ['left_shoulder','left_elbow'],['left_elbow','left_wrist'],
    ['right_shoulder','right_elbow'],['right_elbow','right_wrist'],
    ['left_shoulder','left_hip'],['right_shoulder','right_hip'],
    ['left_hip','right_hip'],
    ['left_hip','left_knee'],['right_hip','right_knee'],
    ['left_knee','left_ankle'],['right_knee','right_ankle'],
  ];

  // URL params
  const bossId = $derived(page.url.searchParams.get('boss') ?? 'goblin');
  const exerciseType = $derived(page.url.searchParams.get('exercise') ?? 'pushup');

  // Boss and exercise config
  const boss: Boss = $derived(getBoss(bossId) ?? getBoss('goblin')!);
  const exerciseConfig: ExerciseConfig = $derived(EXERCISES[exerciseType] ?? EXERCISES['pushup']!);

  // Core state
  let battle: Battle | null = $state(null);
  let battleState: BattleState = $state({
    bossHP: 0, bossMaxHP: 0, reps: 0, damageDealt: 0,
    result: 'active', xpEarned: 0, timeElapsedSecs: 0,
  });
  let exerciseDetector: ExerciseDetector | null = $state(null);

  // UI state
  let isLoading = $state(true);
  let loadingMsg = $state('DEMARRAGE...');
  let isPaused = $state(false);
  let secsLeft = $state(0);
  let formScore = $state(0);
  let showRepCounter = $state(false);
  let currentReps = $state(0);
  let countdown = $state(0); // 3-2-1 pre-battle countdown
  let showLevelUp = $state(false);
  let levelBefore = 0;

  // Canvas / video refs
  let canvasEl: HTMLCanvasElement | undefined = $state();
  let videoEl: HTMLVideoElement | undefined = $state();
  let containerEl: HTMLDivElement | undefined = $state();

  // Animation and timer handles
  let animHandle: number = 0;
  let timerHandle: ReturnType<typeof setInterval> | null = null;
  let saveHandle: ReturnType<typeof setInterval> | null = null;
  let repPopTimer: ReturnType<typeof setTimeout> | null = null;
  let gameActive = false;

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
    if (battle) {
      battleState = battle.getState();
    }
  }

  // --- Camera + Skeleton Rendering ---
  function renderLoop(): void {
    if (!gameActive || !canvasEl || !videoEl) return;

    const canvas = canvasEl;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fit canvas to display size
    if (canvas.width !== canvas.offsetWidth) canvas.width = canvas.offsetWidth;
    if (canvas.height !== canvas.offsetHeight) canvas.height = canvas.offsetHeight;

    const W = canvas.width;
    const H = canvas.height;

    ctx.save();
    // Mirror horizontally (selfie mode)
    ctx.translate(W, 0);
    ctx.scale(-1, 1);

    // Draw camera frame (cover-fit)
    if (videoEl.readyState >= 2) {
      const vw = videoEl.videoWidth || W;
      const vh = videoEl.videoHeight || H;
      const scale = Math.max(W / vw, H / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(videoEl, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }

    ctx.restore();

    // Pose detection + skeleton (async, non-blocking)
    if (!isPaused && videoEl.readyState >= 2 && isDetectorReady()) {
      detectPose(videoEl).then((keypoints) => {
        if (!gameActive || !canvasEl || keypoints.length === 0) return;
        const cCtx = canvasEl.getContext('2d');
        if (!cCtx) return;

        const cW = canvasEl.width;
        const cH = canvasEl.height;
        const vw = videoEl!.videoWidth || cW;
        const vh = videoEl!.videoHeight || cH;
        const scale = Math.max(cW / vw, cH / vh);
        const ox = (cW - vw * scale) / 2;
        const oy = (cH - vh * scale) / 2;

        // Scale keypoints to canvas and mirror
        const scaled = keypoints.map((k) => ({
          name: k.name,
          score: k.score,
          x: cW - (k.x * scale + ox), // mirror
          y: k.y * scale + oy,
        }));
        const sm = Object.fromEntries(scaled.map((k) => [k.name, k]));

        drawSkeleton(cCtx, sm, scaled);

        // Process exercise detection
        if (exerciseDetector) {
          const prevReps = exerciseDetector.getReps();
          exerciseDetector.processFrame(keypoints);
          const newReps = exerciseDetector.getReps();
          formScore = exerciseDetector.getFormScore() * 100;

          if (newReps > prevReps) {
            onRep();
          }
        }
      }).catch(() => {});
    }

    animHandle = requestAnimationFrame(renderLoop);
  }

  function drawSkeleton(
    ctx: CanvasRenderingContext2D,
    sm: Record<string, { name: string; score: number; x: number; y: number }>,
    scaled: { name: string; score: number; x: number; y: number }[],
  ): void {
    // Lines
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const [a, b] of CONNECTIONS) {
      const ka = sm[a];
      const kb = sm[b];
      if (ka && kb && ka.score > 0.3 && kb.score > 0.3) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,60,60,0.85)';
        ctx.moveTo(ka.x, ka.y);
        ctx.lineTo(kb.x, kb.y);
        ctx.stroke();
      }
    }

    // Points
    for (const k of scaled) {
      if (k.score > 0.3) {
        ctx.beginPath();
        ctx.arc(k.x, k.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff3a3a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // --- Game Logic ---
  function onRep(): void {
    if (!battle || !gameActive) return;
    battle.dealDamage();
    updateBattleState();
    currentReps = battleState.reps;
    playSound('rep');

    // Show rep pop
    showRepCounter = true;
    if (repPopTimer) clearTimeout(repPopTimer);
    repPopTimer = setTimeout(() => { showRepCounter = false; }, 750);

    // Check victory
    if (battleState.result === 'victory') {
      endBattle('victory');
    }
  }

  function startTimer(): void {
    secsLeft = boss.timeLimitSecs;
    timerHandle = setInterval(() => {
      if (isPaused || !gameActive) return;
      secsLeft--;
      if (battle) {
        battle.tick();
        updateBattleState();
      }
      if (secsLeft <= 30 && secsLeft > 0) {
        playSound('warning');
      }
      if (secsLeft <= 0) {
        endBattle('defeat');
      }
    }, 1000);
  }

  function endBattle(result: 'victory' | 'defeat'): void {
    gameActive = false;
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    if (saveHandle) { clearInterval(saveHandle); saveHandle = null; }
    cancelAnimationFrame(animHandle);
    clearBattleState();

    if (result === 'victory') {
      if (battle) {
        // Ensure the battle state reflects victory (it should from dealDamage)
        updateBattleState();
      }
      playSound('victory');

      // Save XP to localStorage for guest
      const earned = battleState.xpEarned;
      const currentXP = parseInt(localStorage.getItem('pushquest_xp') ?? '0', 10);
      const newXP = currentXP + earned;
      localStorage.setItem('pushquest_xp', String(newXP));

      // Level-up detection
      const levelAfter = computeLevel(newXP);
      if (levelAfter > levelBefore) {
        showLevelUp = true;
        playSound('levelup');
        setTimeout(() => { showLevelUp = false; }, 3000);
      }

      // Save battle history
      saveBattleHistory('victory');
    } else {
      if (battle) {
        battle.timeUp();
        updateBattleState();
      }
      playSound('defeat');
      saveBattleHistory('defeat');
    }
  }

  function saveBattleHistory(result: string): void {
    try {
      const history = JSON.parse(localStorage.getItem('pushquest_history') ?? '[]');
      history.unshift({
        bossId: boss.id,
        bossName: boss.name,
        result,
        reps: battleState.reps,
        date: new Date().toISOString(),
      });
      // Keep last 50 entries
      if (history.length > 50) history.length = 50;
      localStorage.setItem('pushquest_history', JSON.stringify(history));
    } catch {}
  }

  function pauseGame(): void {
    isPaused = true;
  }

  function resumeGame(): void {
    isPaused = false;
  }

  function fleeGame(): void {
    gameActive = false;
    if (battle) battle.flee();
    updateBattleState();
    cleanup();
    goto('/');
  }

  function closeBattle(): void {
    gameActive = false;
    cleanup();
    goto('/');
  }

  function handleVictoryClaim(): void {
    cleanup();
    goto('/');
  }

  function handleRetry(): void {
    cleanup();
    goto(`/battle?boss=${bossId}&exercise=${exerciseType}`);
  }

  function handleEasierBoss(): void {
    cleanup();
    goto('/');
  }

  function stopCamera(): void {
    if (videoEl?.srcObject) {
      const stream = videoEl.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    }
  }

  function cleanup(): void {
    gameActive = false;
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    if (saveHandle) { clearInterval(saveHandle); saveHandle = null; }
    if (repPopTimer) { clearTimeout(repPopTimer); repPopTimer = null; }
    cancelAnimationFrame(animHandle);
    stopCamera();
  }

  // --- Initialization ---
  onMount(() => {
    preloadSounds();

    let visibilityCleanup: (() => void) | null = null;

    async function initBattle(): Promise<void> {
      // Create battle and exercise detector
      battle = createBattle(boss);
      exerciseDetector = createExerciseDetector(exerciseConfig);
      updateBattleState();
      secsLeft = boss.timeLimitSecs;

      // Request camera + load model in parallel
      loadingMsg = 'DEMARRAGE...';
      try {
        const [stream] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          }),
          initDetector((msg) => { loadingMsg = msg.toUpperCase(); }),
        ]);
        if (!videoEl) return;
        videoEl.srcObject = stream;
        await videoEl.play();
      } catch (e) {
        loadingMsg = (e as Error)?.message?.includes('Permission')
          ? 'CAMERA REFUSEE'
          : 'ECHEC CHARGEMENT';
        console.error('Init error:', e);
        return;
      }

      // Ready - run 3-2-1 countdown then start game
      isLoading = false;
      levelBefore = computeLevel(parseInt(localStorage.getItem('pushquest_xp') ?? '0', 10));
      countdown = 3;
      const countdownInterval = setInterval(() => {
        countdown--;
        playSound('countdown');
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          gameActive = true;
          startTimer();
          renderLoop();
        }
      }, 1000);

      // Auto-save every 5 seconds
      saveHandle = setInterval(() => {
        if (!battle || !gameActive) return;
        const state = battle.getState();
        saveBattleState({
          bossId: boss.id,
          exerciseType,
          bossHP: state.bossHP,
          reps: state.reps,
          timeElapsedSecs: state.timeElapsedSecs,
          savedAt: Date.now(),
        });
      }, 5000);

      // Auto-pause on visibility change
      visibilityCleanup = onVisibilityChange(
        () => { if (gameActive) pauseGame(); },
        () => { /* don't auto-resume, user must tap resume */ },
      );
    }

    initBattle();

    return () => {
      cleanup();
      if (visibilityCleanup) visibilityCleanup();
    };
  });
</script>

<div bind:this={containerEl} class="fixed inset-0 bg-black flex flex-col overflow-hidden">
  <!-- Hidden video element for camera capture -->
  <video bind:this={videoEl} class="hidden" autoplay playsinline muted></video>

  <!-- Canvas: full viewport -->
  <canvas bind:this={canvasEl} class="absolute inset-0 w-full h-full"></canvas>

  <!-- Gradient overlays -->
  <div class="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-black/[0.88] to-transparent pointer-events-none z-[2]"></div>
  <div class="absolute bottom-0 left-0 right-0 h-[220px] bg-gradient-to-t from-black/[0.92] to-transparent pointer-events-none z-[2]"></div>

  {#if isActive || isLoading}
    <!-- Top HUD -->
    <div class="absolute top-0 left-0 right-0 flex justify-between items-center px-5 z-10"
      style="padding-top: calc(18px + var(--safe-top, 0px))">
      <button
        class="w-[34px] h-[34px] rounded-full bg-white/[0.12] border-none text-white text-sm cursor-pointer flex items-center justify-center"
        onclick={closeBattle}
      >
        ✕
      </button>
      <div class="text-[1.05rem] font-black tracking-[5px] uppercase">{boss.name}</div>
      <div class="font-mono text-[0.95rem] font-bold tracking-[1px] flex items-center gap-1.5 {timerWarning ? 'text-[#ff6b6b]' : 'text-white'}">
        ⏱ {timerDisplay()}
      </div>
    </div>

    <!-- HP Bar -->
    <div class="absolute top-[60px] left-5 right-5 z-10">
      <div class="relative">
        <div class="absolute -top-2 -left-2 w-6 h-6 border-t border-l border-primary/40"></div>
        <div class="absolute -top-2 -right-2 w-6 h-6 border-t border-r border-primary/40"></div>
        <div class="absolute -bottom-2 -left-2 w-6 h-6 border-b border-l border-primary/40"></div>
        <div class="absolute -bottom-2 -right-2 w-6 h-6 border-b border-r border-primary/40"></div>
        <HPBar current={battleState.bossHP} max={battleState.bossMaxHP} />
      </div>
    </div>

    <!-- Rep Counter (center) -->
    <RepCounter count={currentReps} visible={showRepCounter} />

    <!-- Bottom HUD -->
    <div class="absolute left-5 right-5 z-10 flex flex-col gap-2.5"
      style="bottom: calc(36px + var(--safe-bottom, 0px))">
      <FormScoreBar value={formScore} />
      <div class="flex gap-2.5">
        <button
          class="flex-1 py-3.5 bg-black/50 border-[1.5px] border-white/[0.18] text-white font-bold text-xs tracking-[3px] uppercase rounded-[12px] cursor-pointer backdrop-blur-md"
          onclick={pauseGame}
        >
          PAUSE
        </button>
        <button
          class="flex-1 py-3.5 bg-black/50 border-[1.5px] border-primary/60 text-primary font-bold text-xs tracking-[3px] uppercase rounded-[12px] cursor-pointer backdrop-blur-md"
          onclick={fleeGame}
        >
          FUIR
        </button>
      </div>
    </div>
  {/if}

  <!-- Loading Overlay -->
  {#if isLoading}
    <div class="absolute inset-0 bg-[rgba(8,8,15,0.92)] flex flex-col items-center justify-center z-30 gap-[18px] loading-grid">
      <div class="w-[38px] h-[38px] border-[3px] border-white/[0.08] border-t-primary rounded-full animate-spin"></div>
      <div class="text-xs tracking-[4px] text-dim">{loadingMsg}</div>
      {#if loadingMsg === 'CAMERA REFUSEE' || loadingMsg === 'ECHEC CHARGEMENT'}
        <button
          class="mt-4 py-3 px-8 bg-primary text-white font-bold rounded-[14px] text-xs tracking-[3px] uppercase
            hover:bg-primary-hover active:scale-[0.97] transition-all"
          onclick={closeBattle}
        >
          RETOUR
        </button>
      {/if}
    </div>
  {/if}

  <!-- Countdown Overlay (3-2-1) -->
  {#if countdown > 0 && !isLoading}
    <div class="absolute inset-0 bg-[rgba(8,8,15,0.85)] flex items-center justify-center z-[28]">
      <span class="font-mono text-8xl font-black text-primary"
        style="text-shadow: 0 0 40px rgba(230,57,70,0.8), 0 0 80px rgba(230,57,70,0.4);
               animation: repPop 0.8s ease-out both"
      >{countdown}</span>
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
      <button
        class="py-3 px-9 bg-primary text-white font-black rounded-[14px] tracking-[4px] uppercase hover:bg-primary-hover active:scale-[0.98] transition-all"
        onclick={resumeGame}
      >
        REPRENDRE
      </button>
      <button
        class="py-3 px-9 bg-transparent border-[1.5px] border-white/25 text-white font-bold text-xs tracking-[3px] rounded-[12px] cursor-pointer"
        onclick={closeBattle}
      >
        QUITTER
      </button>
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
  @keyframes hpCritical {
    0%, 100% { box-shadow: 0 0 5px rgba(230,57,70,0.3); }
    50% { box-shadow: 0 0 15px rgba(230,57,70,0.6); }
  }

  .loading-grid {
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 32px 32px;
  }
</style>
