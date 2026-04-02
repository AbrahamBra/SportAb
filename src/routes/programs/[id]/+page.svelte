<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getProgram, GOAL_INFO, SPLIT_INFO, loadExercises, getExercise } from '$lib/data';
  import type { Program, ProgramPhase, ProgramSession } from '$lib/data/types';
  import { setActiveProgram } from '$lib/utils/session-storage';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';
  import DetectionBadge from '$lib/components/DetectionBadge.svelte';

  let program = $state<Program | undefined>(undefined);
  let exercisesLoaded = $state(false);
  let expandedPhase = $state<string | null>(null);
  let expandedSession = $state<string | null>(null);

  const goal = $derived(program ? GOAL_INFO[program.goal] : null);
  const split = $derived(program ? SPLIT_INFO[program.split] : null);

  onMount(async () => {
    const id = page.params.id as string | undefined;
    if (!id) { goto('/programs'); return; }
    program = getProgram(id);
    if (!program) { goto('/programs'); return; }
    await loadExercises();
    exercisesLoaded = true;
    // Auto-expand first phase
    const firstPhase = program.phases[0];
    if (firstPhase) {
      expandedPhase = firstPhase.id;
    }
  });

  function togglePhase(phaseId: string) {
    expandedPhase = expandedPhase === phaseId ? null : phaseId;
    expandedSession = null;
  }

  function toggleSession(sessionId: string) {
    expandedSession = expandedSession === sessionId ? null : sessionId;
  }

  function getExerciseName(id: string): string {
    return getExercise(id)?.name ?? id.replace(/_/g, ' ');
  }

  function getExerciseMuscles(id: string): string {
    const ex = getExercise(id);
    if (!ex) return '';
    return ex.primaryMuscles.join(', ');
  }
</script>

<BackgroundFX />

<div class="relative z-10 flex flex-col items-center min-h-screen px-6 pt-10 pb-10 max-w-[420px] mx-auto">

  {#if !program}
    <p class="font-mono text-dim/60 tracking-[3px] text-sm">Chargement...</p>
  {:else}
    <!-- Back -->
    <div class="w-full flex items-center justify-between mb-6"
      style="animation: fadeInDown 0.5s ease-out both">
      <a href="/programs"
        class="font-mono text-[0.6rem] tracking-[3px] text-dim/60 hover:text-primary/70 transition-colors uppercase">
        ← PROGRAMMES
      </a>
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-primary"
          style="animation: statusDot 1.5s ease-in-out infinite; box-shadow: 0 0 6px color-mix(in srgb, var(--color-primary) 90%, transparent)"></span>
        <span class="font-mono text-[0.6rem] tracking-[4px] text-primary/70 uppercase">{goal?.label}</span>
      </div>
    </div>

    <!-- Program Header -->
    <div class="w-full mb-6" style="animation: fadeInDown 0.6s 0.05s ease-out both">
      <h1 class="text-[1.6rem] font-black tracking-[3px] uppercase leading-none italic mb-2"
        style="text-shadow: 0 0 20px color-mix(in srgb, var(--color-primary) 55%, transparent)">
        {program.name}
      </h1>
      <p class="text-[0.65rem] text-dim/70 font-mono tracking-[0.5px] leading-relaxed mb-3">
        {program.description}
      </p>

      <!-- Stats row -->
      <div class="flex gap-3" style="animation: fadeInUp 0.5s 0.2s ease-out both">
        <div class="flex-1 bg-surface/70 backdrop-blur-sm border border-white/[0.06] rounded-lg px-3 py-2.5 -skew-x-3">
          <div class="skew-x-3 text-center">
            <span class="block text-primary font-black text-lg" style="text-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 50%, transparent)">{program.daysPerWeek}</span>
            <span class="text-[0.5rem] text-dim/50 font-mono tracking-[2px] uppercase">jours/sem</span>
          </div>
        </div>
        <div class="flex-1 bg-surface/70 backdrop-blur-sm border border-white/[0.06] rounded-lg px-3 py-2.5 -skew-x-3">
          <div class="skew-x-3 text-center">
            <span class="block text-primary font-black text-lg" style="text-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 50%, transparent)">{program.durationWeeks}</span>
            <span class="text-[0.5rem] text-dim/50 font-mono tracking-[2px] uppercase">semaines</span>
          </div>
        </div>
        <div class="flex-1 bg-surface/70 backdrop-blur-sm border border-white/[0.06] rounded-lg px-3 py-2.5 -skew-x-3">
          <div class="skew-x-3 text-center">
            <span class="block text-primary font-black text-lg" style="text-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 50%, transparent)">{split?.label}</span>
            <span class="text-[0.5rem] text-dim/50 font-mono tracking-[2px] uppercase">split</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Equipment -->
    <div class="w-full mb-5" style="animation: fadeInUp 0.5s 0.3s ease-out both">
      <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase mb-2">◆ Equipement</p>
      <div class="flex gap-1.5 flex-wrap">
        {#each program.equipmentNeeded as eq}
          <span class="bg-surface/80 border border-white/[0.08] rounded-md px-2.5 py-1 text-[0.55rem] text-dim/70 font-mono tracking-[1px] capitalize">
            {eq}
          </span>
        {/each}
      </div>
    </div>

    <!-- Phases -->
    <div class="w-full mb-7" style="animation: fadeInUp 0.5s 0.4s ease-out both">
      <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase mb-2.5">◆ Phases</p>

      <div class="relative">
        <div class="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-primary/50"></div>
        <div class="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-primary/50"></div>
        <div class="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-primary/50"></div>
        <div class="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-primary/50"></div>

        <div class="flex flex-col gap-2">
          {#each program.phases as phase, pi}
            <div style="animation: slideInLeft 0.4s {0.05 * pi + 0.45}s ease-out both">
              <!-- Phase header -->
              <button
                class="w-full relative backdrop-blur-sm border-l-4 rounded-lg transition-all duration-200 overflow-hidden -skew-x-[12deg]
                  {expandedPhase === phase.id
                    ? 'bg-surface/90 border-primary border-y border-r border-white/10 shadow-[0_0_15px_color-mix(in srgb, var(--color-primary) 20%, transparent)]'
                    : 'bg-surface/60 border-white/15 border-y border-r border-white/[0.05] hover:border-primary/40 hover:bg-surface/80'}"
                onclick={() => togglePhase(phase.id)}
              >
                <div class="skew-x-[12deg] flex items-center justify-between px-4 py-3">
                  <div class="flex flex-col gap-0.5">
                    <span class="font-black tracking-[2px] uppercase text-sm text-white/90">
                      Phase {phase.phaseOrder}: {phase.name}
                    </span>
                    <span class="text-[0.55rem] text-dim/60 font-mono tracking-[1px]">
                      Semaines {phase.weekStart}-{phase.weekEnd} · {phase.intensity}
                    </span>
                  </div>
                  <span class="text-dim/40 text-xs font-mono">
                    {expandedPhase === phase.id ? '▼' : '▶'}
                  </span>
                </div>
              </button>

              <!-- Phase sessions (expanded) -->
              {#if expandedPhase === phase.id && phase.sessions.length > 0}
                <div class="ml-4 mt-1 flex flex-col gap-1.5"
                  style="animation: fadeInUp 0.3s ease-out both">
                  {#each phase.sessions as session, si}
                    <!-- Session header -->
                    <button
                      class="w-full backdrop-blur-sm border-l-2 rounded-md transition-all duration-150 -skew-x-[8deg]
                        {expandedSession === session.id
                          ? 'bg-surface-raised/80 border-gold/60 border-y border-r border-white/[0.06]'
                          : 'bg-surface/40 border-white/10 border-y border-r border-white/[0.03] hover:border-gold/30'}"
                      onclick={() => toggleSession(session.id)}
                    >
                      <div class="skew-x-[8deg] flex items-center justify-between px-3 py-2.5">
                        <div class="flex items-center gap-2">
                          <span class="text-[0.6rem] text-gold/70 font-mono">J{session.sessionOrder}</span>
                          <span class="font-bold tracking-[1.5px] uppercase text-[0.7rem] text-white/80">{session.name}</span>
                        </div>
                        <span class="text-[0.5rem] text-dim/40 font-mono">
                          {session.exercises.length} exos {expandedSession === session.id ? '▼' : '▶'}
                        </span>
                      </div>
                    </button>

                    <!-- Exercises (expanded) -->
                    {#if expandedSession === session.id}
                      <div class="ml-3 flex flex-col gap-0.5"
                        style="animation: fadeInUp 0.2s ease-out both">
                        {#each session.exercises as ex, ei}
                          <div class="flex items-center gap-2 px-3 py-2 bg-surface/30 rounded-md border border-white/[0.03]">
                            <span class="text-[0.55rem] text-primary/60 font-mono w-4 shrink-0">{ei + 1}</span>
                            <DetectionBadge exerciseId={ex.exerciseId} />
                            <div class="flex-1 min-w-0">
                              <span class="block text-[0.65rem] text-white/80 font-bold tracking-[0.5px] truncate">
                                {exercisesLoaded ? getExerciseName(ex.exerciseId) : ex.exerciseId.replace(/_/g, ' ')}
                              </span>
                              {#if exercisesLoaded}
                                <span class="text-[0.5rem] text-dim/40 font-mono capitalize">{getExerciseMuscles(ex.exerciseId)}</span>
                              {/if}
                            </div>
                            <div class="flex flex-col items-end shrink-0">
                              <span class="text-[0.6rem] text-primary/80 font-mono font-bold">
                                {ex.sets}x{ex.reps}
                              </span>
                              <span class="text-[0.45rem] text-dim/40 font-mono">
                                {ex.restSecs}s repos
                                {#if ex.rpe} · RPE {ex.rpe}{/if}
                              </span>
                            </div>
                          </div>
                        {/each}
                        {#if session.restBetweenExercisesSecs}
                          <span class="text-[0.5rem] text-dim/30 font-mono tracking-[1px] px-3 py-1">
                            Repos entre exercices: {session.restBetweenExercisesSecs}s
                          </span>
                        {/if}
                      </div>
                    {/if}
                  {/each}
                </div>
              {:else if expandedPhase === phase.id && phase.sessions.length === 0}
                <div class="ml-4 mt-1 px-3 py-3 bg-surface/30 rounded-md border border-white/[0.04] -skew-x-[6deg]">
                  <p class="skew-x-[6deg] text-[0.55rem] text-dim/40 font-mono tracking-[1px] italic">
                    Progression identique a la phase precedente, intensite ajustee ({phase.intensity})
                  </p>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Start Program Button -->
    {#if program.isFree}
      <div class="w-full relative" style="animation: fadeInUp 0.5s 0.7s ease-out both">
        <div class="absolute inset-0 rounded-[14px] -skew-x-[10deg]"
          style="background: color-mix(in srgb, var(--color-primary) 15%, transparent); animation: pulseGlow 2.5s ease-in-out infinite;"></div>
        <button
          class="relative w-full py-4 bg-primary text-white font-black rounded-[14px] text-[0.95rem] tracking-[5px] uppercase cursor-pointer transition-all
            hover:bg-primary-hover active:scale-[0.97] -skew-x-[10deg]
            shadow-[0_0_25px_color-mix(in srgb, var(--color-primary) 35%, transparent)]"
          onclick={() => {
            if (!program) return;
            setActiveProgram({
              programId: program.id,
              currentPhaseIdx: 0,
              currentWeek: 1,
              nextSessionIdx: 0,
              startedAt: new Date().toISOString(),
            });
            goto('/session');
          }}
        >
          <span class="inline-block skew-x-[10deg]">◆ COMMENCER</span>
        </button>
      </div>
    {:else}
      <div class="w-full relative" style="animation: fadeInUp 0.5s 0.7s ease-out both">
        <button
          class="relative w-full py-4 bg-gold/20 border-2 border-gold/40 text-gold font-black rounded-[14px] text-[0.85rem] tracking-[4px] uppercase cursor-pointer transition-all
            hover:bg-gold/30 -skew-x-[10deg]"
          style="text-shadow: 0 0 12px color-mix(in srgb, var(--color-gold) 50%, transparent)"
        >
          <span class="inline-block skew-x-[10deg]">⬡ PREMIUM - BIENTOT</span>
        </button>
      </div>
    {/if}
  {/if}
</div>
