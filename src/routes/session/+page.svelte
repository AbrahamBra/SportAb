<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getProgram, loadExercises, getExercise } from '$lib/data';
  import type { Program, ProgramSession, SessionExercise } from '$lib/data/types';
  import { hasDetection, getDetectionConfig } from '$lib/ai/exercises.config';
  import { createSessionEngine, type SessionEngine, type SessionState } from '$lib/game/session-engine';
  import { getActiveProgram, advanceSession, saveSessionCompletion } from '$lib/utils/session-storage';
  import { EXERCISES } from '$lib/ai/exercises.config';
  import { loadSessionBattleResult, clearSessionBattleResult } from '$lib/utils/session-battle-state';
  import { computeNextTargets, getEncouragement, type ExerciseTarget } from '$lib/game/progression-engine';
  import { getSessionHistory } from '$lib/utils/session-storage';
  import { getLastWeight } from '$lib/utils/exercise-history';
  import { loadStartingWeights } from '$lib/game/starting-weights';
  import { playSound, preloadSounds } from '$lib/game/audio';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';
  import FormFeedback from '$lib/components/FormFeedback.svelte';
  import RestTimer from '$lib/components/RestTimer.svelte';
  import SetTracker from '$lib/components/SetTracker.svelte';
  import ManualRepInput from '$lib/components/ManualRepInput.svelte';
  import DetectionBadge from '$lib/components/DetectionBadge.svelte';
  import SessionSummary from '$lib/components/SessionSummary.svelte';

  // Program/session data
  let program = $state<Program | undefined>(undefined);
  let session = $state<ProgramSession | undefined>(undefined);
  let engine = $state<SessionEngine | undefined>(undefined);
  let sessionState = $state<SessionState | undefined>(undefined);
  let exercisesLoaded = $state(false);
  let error = $state<string | null>(null);

  // Timer interval
  let timerHandle: ReturnType<typeof setInterval> | null = null;

  // AI rep counting state
  let aiReps = $state(0);
  let aiTargetReps = $state(0);
  let showFormFeedback = $state(false);
  let lastFormScore = $state(0);

  // Progression state
  let exerciseTargets = $state<Map<string, ExerciseTarget>>(new Map());
  let encouragement = $state<string | null>(null);
  let encouragementTimer: ReturnType<typeof setTimeout> | null = null;

  function showEncouragement(msg: string | null): void {
    if (!msg) return;
    encouragement = msg;
    if (encouragementTimer) clearTimeout(encouragementTimer);
    encouragementTimer = setTimeout(() => { encouragement = null; }, 2500);
  }

  function getTarget(exerciseId: string): ExerciseTarget | undefined {
    return exerciseTargets.get(exerciseId);
  }

  function updateState(): void {
    if (engine) sessionState = engine.getState();
  }

  function getExerciseName(id: string): string {
    return getExercise(id)?.name ?? id.replace(/_/g, ' ');
  }

  function startExercise(ex: SessionExercise): void {
    if (!engine) return;
    const isAI = hasDetection(ex.exerciseId);
    engine.startExercise(isAI ? 'ai' : 'manual');

    if (isAI) {
      // Parse target reps for AI counting
      const repStr = ex.reps;
      const match = repStr.match(/(\d+)/);
      aiTargetReps = match ? parseInt(match[1], 10) : 10;
      aiReps = 0;
    }

    updateState();
  }

  function completeManualSet(reps: number, weightKg?: number): void {
    if (!engine || !sessionState?.currentExercise) return;
    const ex = sessionState.currentExercise;
    const lastW = getLastWeight(ex.exerciseId);
    engine.completeSet(reps, weightKg ?? null);
    playSound('rep');
    // Encouragement
    const msg = getEncouragement(reps, ex.reps, weightKg ?? null, lastW);
    showEncouragement(msg);
    updateState();
    startRestTimer();
  }

  function completeAISet(): void {
    if (!engine) return;
    engine.completeSet(aiReps, null, null, null);
    playSound('rep');
    aiReps = 0;
    updateState();
    startRestTimer();
  }

  function addAIRep(): void {
    aiReps++;
    playSound('rep');
    if (aiReps >= aiTargetReps) {
      completeAISet();
    }
  }

  function startRestTimer(): void {
    if (!engine) return;
    if (sessionState?.phase === 'complete') {
      finishSession();
      return;
    }
    // Timer ticks handled by interval
  }

  function skipRest(): void {
    if (!engine) return;
    engine.skipRest();
    updateState();
  }

  function finishSession(): void {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    if (!engine || !session || !program) return;

    const state = engine.getState();
    const xp = state.totalReps * 2;

    // Save XP
    const currentXP = parseInt(localStorage.getItem('pushquest_xp') ?? '0', 10);
    localStorage.setItem('pushquest_xp', String(currentXP + xp));

    // Save session completion
    const ap = getActiveProgram();
    if (ap) {
      saveSessionCompletion({
        programId: ap.programId,
        phaseIdx: ap.currentPhaseIdx,
        sessionIdx: ap.nextSessionIdx,
        date: new Date().toISOString(),
        totalReps: state.totalReps,
        durationSecs: state.elapsedSecs,
        logs: state.logs,
      });
      // Advance to next session in program
      const phase = program.phases[ap.currentPhaseIdx];
      if (phase) advanceSession(phase.sessions.length);
    }
  }

  function handleSummaryClose(): void {
    goto('/');
  }

  onMount(async () => {
    preloadSounds();
    await loadExercises();
    exercisesLoaded = true;

    const ap = getActiveProgram();
    if (!ap) {
      error = 'Aucun programme actif';
      return;
    }

    program = getProgram(ap.programId);
    if (!program) {
      error = 'Programme introuvable';
      return;
    }

    const phase = program.phases[ap.currentPhaseIdx];
    if (!phase || !phase.sessions.length) {
      error = 'Phase sans seances';
      return;
    }

    const sessionIdx = ap.nextSessionIdx % phase.sessions.length;
    session = phase.sessions[sessionIdx];
    if (!session) {
      error = 'Seance introuvable';
      return;
    }

    engine = createSessionEngine(session, hasDetection);
    updateState();

    // Compute progression targets for all exercises
    const history = getSessionHistory();
    const startingW = loadStartingWeights();
    const targets = new Map<string, ExerciseTarget>();
    for (const ex of session.exercises) {
      const target = computeNextTargets(ex, history);
      // If no suggested weight but starting weights exist, use those
      if (target.suggestedWeightKg === null && startingW && startingW[ex.exerciseId]) {
        target.suggestedWeightKg = startingW[ex.exerciseId]!;
        target.progressionNote = `Poids suggere : ${target.suggestedWeightKg}kg`;
      }
      targets.set(ex.exerciseId, target);
    }
    exerciseTargets = targets;

    // Check for returning from session battle
    const battleResult = loadSessionBattleResult();
    if (battleResult && engine) {
      clearSessionBattleResult();
      // Complete the current set with camera results
      engine.completeSet(battleResult.reps, null, battleResult.formScore);
      updateState();
      if (battleResult.formScore !== null) {
        lastFormScore = battleResult.formScore * 100;
        showFormFeedback = true;
      }
    }

    // Tick for rest timer
    timerHandle = setInterval(() => {
      if (engine && sessionState?.phase === 'rest') {
        engine.tick();
        updateState();
      }
    }, 1000);

    return () => {
      if (timerHandle) clearInterval(timerHandle);
    };
  });
</script>

<BackgroundFX />

<div class="relative z-10 flex flex-col items-center min-h-screen px-6 pt-10 pb-10 max-w-[420px] mx-auto">

  {#if error}
    <!-- Error state -->
    <div class="flex flex-col items-center gap-4 mt-20" style="animation: fadeInUp 0.5s ease-out both">
      <p class="font-mono text-[0.7rem] text-primary tracking-[2px]">{error}</p>
      <a href="/programs"
        class="py-3 px-6 bg-primary text-white font-bold rounded-lg text-[0.7rem] tracking-[3px] uppercase">
        CHOISIR UN PROGRAMME
      </a>
    </div>

  {:else if !sessionState || !session || !program}
    <!-- Loading -->
    <p class="font-mono text-dim/60 tracking-[3px] text-sm mt-20"
      style="animation: systemBoot 0.5s ease-out both">CHARGEMENT...</p>

  {:else if sessionState.phase === 'complete'}
    <!-- Session complete -->
    <SessionSummary
      sessionName={session.name}
      programName={program.name}
      logs={sessionState.logs}
      durationSecs={sessionState.elapsedSecs}
      xpEarned={sessionState.totalReps * 2}
      onClose={handleSummaryClose}
    />

  {:else}
    <!-- Active session -->

    <!-- Header -->
    <div class="w-full flex items-center justify-between mb-4"
      style="animation: fadeInDown 0.5s ease-out both">
      <a href="/"
        class="font-mono text-[0.6rem] tracking-[3px] text-dim/60 hover:text-primary/70 transition-colors uppercase">
        ← QUITTER
      </a>
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-gold"
          style="animation: statusDot 1.5s ease-in-out infinite; box-shadow: 0 0 6px rgba(255,209,102,0.9)"></span>
        <span class="font-mono text-[0.6rem] tracking-[4px] text-gold/70 uppercase">EN COURS</span>
      </div>
    </div>

    <!-- Session title -->
    <h1 class="text-[1.4rem] font-black tracking-[3px] uppercase leading-none italic mb-1"
      style="text-shadow: 0 0 15px rgba(230,57,70,0.4); animation: fadeInDown 0.6s 0.05s ease-out both">
      {session.name}
    </h1>
    <p class="font-mono text-[0.55rem] text-dim/50 tracking-[2px] mb-5"
      style="animation: systemBoot 0.8s 0.2s ease-out both">
      {program.name} · Semaine {getActiveProgram()?.currentWeek ?? 1}
    </p>

    <!-- Progress bar -->
    <div class="w-full mb-5" style="animation: fadeInUp 0.5s 0.25s ease-out both">
      <div class="flex justify-between text-[0.5rem] font-mono text-dim/50 tracking-[2px] mb-1">
        <span>PROGRESSION</span>
        <span>{sessionState.exercisesCompleted}/{sessionState.exercisesTotal}</span>
      </div>
      <div class="relative h-1.5 bg-white/[0.06] rounded-sm overflow-hidden">
        <div class="h-full rounded-sm transition-[width] duration-500 ease-out"
          style="width: {(sessionState.exercisesCompleted / sessionState.exercisesTotal) * 100}%;
                 background: linear-gradient(to right, #B8943F, #FFD166);
                 box-shadow: 0 0 8px rgba(255,209,102,0.4);"></div>
      </div>
    </div>

    <!-- Encouragement toast -->
    {#if encouragement}
      <div class="w-full text-center py-2 mb-2" style="animation: fadeInUp 0.2s ease-out both">
        <span class="font-mono text-[0.65rem] font-bold tracking-[1px]
          {encouragement.includes('RECORD') || encouragement.includes('monte') ? 'text-gold' : 'text-dim/70'}"
          style={encouragement.includes('RECORD') ? 'text-shadow: 0 0 10px rgba(255,209,102,0.5)' : ''}>
          {encouragement}
        </span>
      </div>
    {/if}

    {#if sessionState.phase === 'rest'}
      <!-- Rest phase -->
      <div class="w-full flex flex-col items-center py-8" style="animation: fadeInUp 0.3s ease-out both">
        <RestTimer
          seconds={sessionState.restSecsLeft}
          total={sessionState.restSecsTotal}
          onSkip={skipRest}
        />
      </div>

    {:else if sessionState.phase === 'exercise' && sessionState.currentExercise}
      <!-- Active exercise -->
      {@const ex = sessionState.currentExercise}
      <div class="w-full flex flex-col items-center gap-4" style="animation: fadeInUp 0.3s ease-out both">
        <!-- Exercise name -->
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 mb-1">
            <DetectionBadge exerciseId={ex.exerciseId} />
            <h2 class="text-[1rem] font-black tracking-[2px] uppercase text-white">
              {exercisesLoaded ? getExerciseName(ex.exerciseId) : '...'}
            </h2>
          </div>
          <p class="font-mono text-[0.55rem] text-dim/50 tracking-[1px]">
            {ex.sets} x {ex.reps} · Repos {ex.restSecs}s
            {#if ex.rpe} · RPE {ex.rpe}{/if}
          </p>
          {#if ex.notes}
            <p class="font-mono text-[0.5rem] text-gold/50 tracking-[0.5px] mt-1 italic">{ex.notes}</p>
          {/if}
          <!-- Progression note -->
          {@const target = getTarget(ex.exerciseId)}
          {#if target?.progressionNote}
            <p class="font-mono text-[0.5rem] tracking-[1px] mt-1
              {target.isProgression ? 'text-gold/80' : 'text-dim/50'}"
              style={target.isProgression ? 'text-shadow: 0 0 6px rgba(255,209,102,0.4)' : ''}>
              {target.isProgression ? '↑ ' : ''}{target.progressionNote}
            </p>
          {/if}
        </div>

        <!-- Set tracker -->
        <SetTracker
          totalSets={ex.sets}
          completedSets={sessionState.setsCompletedForExercise}
          currentSet={sessionState.currentSetNumber}
        />

        <!-- Input: AI or Manual -->
        {#if sessionState.inputMode === 'ai'}
          {@const detConfig = getDetectionConfig(ex.exerciseId)}
          {@const configId = detConfig ? Object.entries(EXERCISES).find(([_, v]) => v === detConfig)?.[0] ?? 'pushup' : 'pushup'}
          <div class="flex flex-col items-center gap-3 w-full">
            <!-- Camera launch button -->
            <button
              class="w-full py-4 bg-gold/15 border-2 border-gold/40 text-gold font-black rounded-[14px] text-[0.8rem] tracking-[3px] uppercase
                hover:bg-gold/25 active:scale-[0.97] transition-all -skew-x-[8deg]"
              style="text-shadow: 0 0 10px rgba(255,209,102,0.4)"
              onclick={() => goto(`/session/battle?exercise=${configId}&targetReps=${aiTargetReps}`)}
            >
              <span class="inline-block skew-x-[8deg]">📷 LANCER LA CAMERA</span>
            </button>
            <!-- Manual fallback -->
            <button
              class="text-[0.55rem] font-mono text-dim/40 tracking-[2px] hover:text-dim/60 transition-colors"
              onclick={() => { if (engine) engine.startExercise('manual'); updateState(); }}
            >
              COMPTAGE MANUEL
            </button>
          </div>
        {:else}
          <!-- Manual mode -->
          {@const manualTarget = getTarget(ex.exerciseId)}
          <ManualRepInput
            targetReps={manualTarget?.suggestedReps ?? ex.reps}
            suggestedWeight={manualTarget?.suggestedWeightKg}
            isProgression={manualTarget?.isProgression ?? false}
            onSubmit={completeManualSet}
          />
        {/if}
      </div>

    {:else}
      <!-- Idle: exercise list -->
      <div class="w-full" style="animation: fadeInUp 0.5s 0.3s ease-out both">
        <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase mb-2.5">
          ◆ Exercices ({session.exercises.length})
        </p>

        <div class="relative">
          <div class="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-primary/50"></div>
          <div class="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-primary/50"></div>
          <div class="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-primary/50"></div>
          <div class="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-primary/50"></div>

          <div class="flex flex-col gap-1.5">
            {#each session.exercises as ex, i}
              {@const isDone = sessionState.logs.some(l => l.exerciseOrder === ex.exerciseOrder && sessionState.logs.filter(ll => ll.exerciseOrder === ex.exerciseOrder).length >= ex.sets)}
              {@const isCurrent = i === sessionState.currentExerciseIdx}
              <button
                class="w-full relative backdrop-blur-sm border-l-4 rounded-lg transition-all duration-200 overflow-hidden -skew-x-[10deg]
                  {isDone
                    ? 'bg-surface/40 border-success/60 opacity-60'
                    : isCurrent
                      ? 'bg-surface/90 border-primary border-y border-r border-white/10 shadow-[0_0_15px_rgba(230,57,70,0.2)]'
                      : 'bg-surface/60 border-white/15 border-y border-r border-white/[0.05] hover:border-primary/40 hover:bg-surface/80'}"
                onclick={() => { if (!isDone) startExercise(ex); }}
                disabled={isDone}
              >
                <div class="skew-x-[10deg] flex items-center justify-between px-3.5 py-3">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-[0.6rem] font-mono text-dim/40 w-4 shrink-0">{i + 1}</span>
                    <DetectionBadge exerciseId={ex.exerciseId} />
                    <div class="min-w-0">
                      <span class="block text-[0.7rem] font-bold tracking-[1px] truncate
                        {isDone ? 'text-success/60' : isCurrent ? 'text-white' : 'text-white/70'}">
                        {exercisesLoaded ? getExerciseName(ex.exerciseId) : '...'}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-[0.6rem] font-mono {isDone ? 'text-success/50' : 'text-primary/70'} font-bold">
                      {ex.sets}x{ex.reps}
                    </span>
                    {#if isDone}
                      <span class="text-success text-sm">✓</span>
                    {/if}
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Form Feedback Overlay -->
{#if showFormFeedback}
  <FormFeedback
    score={lastFormScore}
    onDismiss={() => { showFormFeedback = false; }}
  />
{/if}
