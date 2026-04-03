<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { createClient } from '$lib/supabase/client';
  import { getDuelRoom, updateDuelRoom, deleteDuelRoom, type DuelRoom } from '$lib/supabase/duel';
  import { createDuelRealtime, type DuelEvent, type DuelRealtime } from '$lib/game/duel-realtime';
  import { EXERCISES } from '$lib/ai/exercises.config';
  import ExerciseCards from '$lib/components/ExerciseCards.svelte';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';

  let { data } = $props();
  const code = $derived(page.params.code ?? '');
  const userId = $derived(data.session?.user?.id ?? '');
  const supabase = createClient();

  // Room state
  let room = $state<DuelRoom | null>(null);
  let loading = $state(true);
  let error = $state('');

  // Lobby state
  let isHost = $derived(room?.host_id === userId);
  let guestPresent = $state(false);
  let guestUsername = $state('Adversaire');
  let guestLevel = $state(1);
  let selectedExercise = $state('');
  let timeLimit = $state(60);
  let myCamera = $state(false);
  let opponentCamera = $state(false);
  let myReady = $state(false);
  let opponentReady = $state(false);
  let countdownValue = $state(0);

  let realtime: DuelRealtime | null = null;

  const TIME_OPTIONS = [30, 60, 90, 120];

  function handleEvent(event: DuelEvent) {
    switch (event.type) {
      case 'player_joined':
        guestPresent = true;
        guestUsername = event.username;
        guestLevel = event.level;
        break;
      case 'exercise_selected':
        selectedExercise = event.exercise_id;
        break;
      case 'settings_updated':
        timeLimit = event.time_limit_secs;
        break;
      case 'camera_toggle':
        if (event.player_id !== userId) opponentCamera = event.shared;
        break;
      case 'player_ready':
        if (event.player_id !== userId) opponentReady = true;
        break;
      case 'countdown_start':
        startCountdown(event.exercise_id);
        break;
    }
  }

  function handlePresenceSync(ids: string[]) {
    if (room) {
      const otherId = isHost ? room.guest_id : room.host_id;
      guestPresent = otherId ? ids.includes(otherId) : ids.length > 1;
    }
  }

  async function selectExercise(id: string) {
    if (!isHost || !room) return;
    selectedExercise = id;
    await updateDuelRoom(room.id, { exercise_id: id });
    realtime?.send({ type: 'exercise_selected', exercise_id: id });
  }

  async function setTime(secs: number) {
    if (!isHost || !room) return;
    timeLimit = secs;
    await updateDuelRoom(room.id, { time_limit_secs: secs });
    realtime?.send({ type: 'settings_updated', time_limit_secs: secs });
  }

  function toggleCamera() {
    myCamera = !myCamera;
    if (room) {
      const field = isHost ? 'host_camera_shared' : 'guest_camera_shared';
      updateDuelRoom(room.id, { [field]: myCamera } as any);
      realtime?.send({ type: 'camera_toggle', player_id: userId, shared: myCamera });
    }
  }

  async function setReady() {
    myReady = true;
    realtime?.send({ type: 'player_ready', player_id: userId });

    // If both ready and host, start countdown
    if (isHost && opponentReady && selectedExercise) {
      const startAt = new Date(Date.now() + 4000).toISOString();
      await updateDuelRoom(room!.id, { status: 'active', started_at: startAt });
      realtime?.send({ type: 'countdown_start', start_at: startAt, exercise_id: selectedExercise });
      startCountdown(selectedExercise);
    }
  }

  // Watch for both ready (guest side)
  $effect(() => {
    if (!isHost && myReady && opponentReady && selectedExercise) {
      // Guest waits for countdown_start from host
    }
    // Host side: if opponent becomes ready after host
    if (isHost && myReady && opponentReady && selectedExercise && countdownValue === 0) {
      const startAt = new Date(Date.now() + 4000).toISOString();
      updateDuelRoom(room!.id, { status: 'active', started_at: startAt });
      realtime?.send({ type: 'countdown_start', start_at: startAt, exercise_id: selectedExercise });
      startCountdown(selectedExercise);
    }
  });

  function startCountdown(exerciseId: string) {
    countdownValue = 3;
    const iv = setInterval(() => {
      countdownValue--;
      if (countdownValue <= 0) {
        clearInterval(iv);
        goto(`/duel/${code}/battle?room=${room!.id}&exercise=${exerciseId}&time=${timeLimit}&host=${isHost}&cam=${myCamera}&opcam=${opponentCamera}`);
      }
    }, 1000);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // fallback: select text
    }
  }

  async function shareCode() {
    if (navigator.share) {
      await navigator.share({
        title: 'PushQuest Duel',
        text: `Rejoins mon duel! Code: ${code}`,
        url: `${window.location.origin}/duel/${code}`,
      }).catch(() => {});
    }
  }

  async function cancelRoom() {
    if (room) await deleteDuelRoom(room.id);
    goto('/duel');
  }

  onMount(() => {
    if (!userId) { goto('/auth/login'); return; }

    async function init() {
      try {
        const r = await getDuelRoom(code);
        if (!r) { goto('/duel'); return; }
        room = r;
        selectedExercise = r.exercise_id || '';
        timeLimit = r.time_limit_secs;

        // Setup realtime
        realtime = createDuelRealtime(supabase, r.id, {
          onEvent: handleEvent,
          onPresenceSync: handlePresenceSync,
        });
        realtime.trackPresence(userId);

        // If guest just joined, announce
        if (!isHost) {
          const username = data.session?.user?.user_metadata?.name || 'Joueur';
          const xp = parseInt(localStorage.getItem('pushquest_xp') || '0', 10);
          const { computeLevel } = await import('$lib/game/progression');
          realtime.send({
            type: 'player_joined',
            player_id: userId,
            username: username as string,
            level: computeLevel(xp),
          });
        }

        // Guest already in room
        if (r.guest_id && isHost) guestPresent = true;
      } catch {
        error = 'Impossible de charger la salle';
      } finally {
        loading = false;
      }
    }

    init();
    return () => { realtime?.destroy(); };
  });
</script>

<div class="relative min-h-screen flex flex-col p-4">
  <BackgroundFX />

  {#if loading}
    <div class="flex-1 flex items-center justify-center">
      <span class="text-white/40">Chargement...</span>
    </div>
  {:else if error}
    <div class="flex-1 flex flex-col items-center justify-center gap-4">
      <p class="text-red-400">{error}</p>
      <a href="/duel" class="text-white/40 underline">Retour</a>
    </div>
  {:else if room}
    <div class="relative z-10 flex flex-col gap-4 max-w-lg mx-auto w-full">

      <!-- Room Code -->
      <div class="text-center">
        <p class="text-white/40 text-xs uppercase tracking-wider">Code de la salle</p>
        <div class="flex items-center justify-center gap-2 mt-1">
          <span class="text-3xl font-black text-white tracking-[0.3em] font-mono">{code}</span>
          <button onclick={copyCode} class="text-white/30 hover:text-white/60 text-sm">Copier</button>
          {#if typeof navigator !== 'undefined' && 'share' in navigator}
            <button onclick={shareCode} class="text-white/30 hover:text-white/60 text-sm">Partager</button>
          {/if}
        </div>
      </div>

      <!-- Players -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Host -->
        <div class="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
          <p class="text-xs text-white/40">HOST</p>
          <p class="font-bold text-white truncate">{isHost ? 'Toi' : 'Host'}</p>
          {#if isHost && myReady}
            <span class="text-green-400 text-xs">PRET</span>
          {:else if !isHost && opponentReady}
            <span class="text-green-400 text-xs">PRET</span>
          {/if}
        </div>
        <!-- Guest -->
        <div class="rounded-xl bg-white/5 border border-white/10 p-3 text-center
          {guestPresent ? '' : 'opacity-40'}">
          <p class="text-xs text-white/40">GUEST</p>
          {#if guestPresent}
            <p class="font-bold text-white truncate">{!isHost ? 'Toi' : guestUsername}</p>
            {#if !isHost && myReady}
              <span class="text-green-400 text-xs">PRET</span>
            {:else if isHost && opponentReady}
              <span class="text-green-400 text-xs">PRET</span>
            {/if}
          {:else}
            <p class="text-white/30 text-sm">En attente...</p>
          {/if}
        </div>
      </div>

      <!-- Camera toggle -->
      <button
        onclick={toggleCamera}
        class="flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-colors
          {myCamera ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 bg-white/5'}"
      >
        <span class="text-sm text-white">Partager ma camera</span>
        <span class="text-xs font-bold {myCamera ? 'text-red-400' : 'text-white/30'}">
          {myCamera ? 'ON' : 'OFF'}
        </span>
      </button>

      <!-- Exercise selection (host only can interact) -->
      <div>
        <p class="text-xs text-white/40 uppercase tracking-wider mb-2">
          {isHost ? 'Choisis l\'exercice' : 'Exercice'}
        </p>
        <ExerciseCards
          selected={selectedExercise}
          onSelect={selectExercise}
          readonly={!isHost}
        />
      </div>

      <!-- Timer selection (host only) -->
      {#if isHost}
        <div>
          <p class="text-xs text-white/40 uppercase tracking-wider mb-2">Duree</p>
          <div class="flex gap-2">
            {#each TIME_OPTIONS as t}
              <button
                onclick={() => setTime(t)}
                class="flex-1 py-2 rounded-lg text-sm font-bold transition-colors
                  {timeLimit === t ? 'bg-red-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}"
              >
                {t}s
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <p class="text-sm text-white/40 text-center">Duree: {timeLimit}s</p>
      {/if}

      <!-- Ready button -->
      <button
        onclick={setReady}
        disabled={!guestPresent || !selectedExercise || myReady}
        class="w-full py-4 rounded-2xl font-bold text-lg transition-all
          {myReady
            ? 'bg-green-600 text-white cursor-default'
            : 'bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-lg shadow-red-600/30'}
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {myReady ? 'EN ATTENTE...' : 'PRET!'}
      </button>

      <!-- Cancel -->
      {#if isHost && !myReady}
        <button onclick={cancelRoom} class="text-white/30 hover:text-white/50 text-sm text-center">
          Annuler la salle
        </button>
      {:else}
        <a href="/duel" class="text-white/30 hover:text-white/50 text-sm text-center">
          Quitter
        </a>
      {/if}
    </div>

    <!-- Countdown overlay -->
    {#if countdownValue > 0}
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <span class="text-8xl font-black text-red-500 animate-pulse">{countdownValue}</span>
      </div>
    {/if}
  {/if}
</div>
