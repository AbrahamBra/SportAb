<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { createClient } from '$lib/supabase/client';
  import { createDuelEngine, getComboTier, type DuelState } from '$lib/game/duel-engine';
  import { createDuelRealtime, type DuelEvent, type DuelRealtime } from '$lib/game/duel-realtime';
  import { createWebRTCPeer, type WebRTCPeer } from '$lib/game/webrtc-peer';
  import { EXERCISES, type ExerciseConfig } from '$lib/ai/exercises.config';
  import { saveDuelResult, updateDuelRoom, updateExerciseRecord } from '$lib/supabase/duel';
  import { playSound, playSoundPitched, vibrate } from '$lib/game/audio';
  import CameraDetection from '$lib/components/CameraDetection.svelte';
  import OpponentView from '$lib/components/OpponentView.svelte';
  import FormScoreBar from '$lib/components/FormScoreBar.svelte';
  import DuelProgressBar from '$lib/components/DuelProgressBar.svelte';
  import DuelResultScreen from '$lib/components/DuelResultScreen.svelte';

  let { data } = $props();

  // URL params
  const roomId = $derived(page.url.searchParams.get('room') ?? '');
  const exerciseId = $derived(page.url.searchParams.get('exercise') ?? 'pushup');
  const timeLimit = $derived(parseInt(page.url.searchParams.get('time') ?? '60', 10));
  const amHost = $derived(page.url.searchParams.get('host') === 'true');
  const myCam = $derived(page.url.searchParams.get('cam') === 'true');
  const opCam = $derived(page.url.searchParams.get('opcam') === 'true');
  const code = $derived(page.params.code);
  const userId = $derived(data.session?.user?.id ?? '');

  const exerciseConfig: ExerciseConfig = $derived(EXERCISES[exerciseId] ?? EXERCISES['pushup']!);

  // Engine
  const engine = createDuelEngine(timeLimit);
  let duelState: DuelState = $state(engine.getState());

  // Realtime
  const supabase = createClient();
  let realtime: DuelRealtime | null = null;

  // WebRTC
  let webrtcPeer: WebRTCPeer | null = null;
  let remoteStream = $state<MediaStream | null>(null);

  // UI state
  let isLoading = $state(true);
  let loadingMsg = $state('DEMARRAGE...');
  let cameraActive = $state(false);
  let formScore = $state(0);
  let secsLeft = $state(0);
  let shaking = $state(false);
  let showResult = $state(false);
  let opponentKeypoints = $state<number[][] | null>(null);
  let opponentDisconnected = $state(false);
  let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let rematchRequested = $state(false);
  let opponentRematchRequested = $state(false);

  // Opponent display mode
  let opponentMode = $derived<'skeleton' | 'video'>(opCam && remoteStream ? 'video' : 'skeleton');

  // Keypoint frame counter for throttling
  let frameCount = 0;

  // Timer display
  const timerDisplay = $derived(() => {
    const m = Math.floor(secsLeft / 60);
    const s = secsLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  // Wake lock
  let wakeLock: WakeLockSentinel | null = null;

  // Timer & tick handles
  let timerHandle: ReturnType<typeof setInterval> | null = null;

  function syncState() {
    duelState = engine.getState();
    secsLeft = Math.max(0, timeLimit - duelState.timeElapsedSecs);
  }

  function handleRep() {
    engine.addMyRep();
    syncState();

    // Broadcast
    realtime?.send({
      type: 'rep_update',
      player_id: userId,
      reps: duelState.myReps,
      combo_tier: duelState.myCombo,
    });

    // Juice
    playSound('rep');
    vibrate(duelState.myCombo >= 5 ? [30, 20, 30] : [40]);
    shaking = true;
    setTimeout(() => { shaking = false; }, 150);
  }

  function handleFormUpdate(score: number) {
    formScore = score;
  }

  function handleEvent(event: DuelEvent) {
    switch (event.type) {
      case 'rep_update':
        if (event.player_id !== userId) {
          engine.updateOpponentReps(event.reps, event.combo_tier);
          syncState();
        }
        break;
      case 'keypoints':
        if (event.player_id !== userId) {
          opponentKeypoints = event.points;
        }
        break;
      case 'battle_end':
        if (event.player_id !== userId) {
          // Host's battle_end is authoritative
          engine.endBattle();
          syncState();
          endBattle();
        }
        break;
      case 'rematch_request':
        if (event.player_id !== userId) {
          opponentRematchRequested = true;
          if (rematchRequested) startRematch();
        }
        break;
      case 'webrtc_offer':
        if (event.player_id !== userId && webrtcPeer) {
          webrtcPeer.handleOffer(event.sdp).then(answer => {
            realtime?.send({ type: 'webrtc_answer', player_id: userId, sdp: answer });
          });
        }
        break;
      case 'webrtc_answer':
        if (event.player_id !== userId && webrtcPeer) {
          webrtcPeer.handleAnswer(event.sdp);
        }
        break;
      case 'ice_candidate':
        if (event.player_id !== userId && webrtcPeer) {
          webrtcPeer.addIceCandidate(event.candidate);
        }
        break;
    }
  }

  function handlePresenceSync(ids: string[]) {
    const opponentPresent = ids.length >= 2 || ids.some(id => id !== userId);
    if (!opponentPresent && duelState.status === 'active') {
      opponentDisconnected = true;
      if (!disconnectTimer) {
        disconnectTimer = setTimeout(() => {
          // Forfeit: opponent disconnected > 10s
          engine.endBattle();
          syncState();
          endBattle();
        }, 10000);
      }
    } else {
      opponentDisconnected = false;
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }
    }
  }

  // Broadcast keypoints (every 3rd frame)
  function handleKeypoints(keypoints: any[]) {
    frameCount++;
    if (frameCount % 3 !== 0) return;
    const normalized = keypoints.map((k: any) => [k.x / 640, k.y / 480, k.score]);
    realtime?.send({ type: 'keypoints', player_id: userId, points: normalized });
  }

  async function endBattle() {
    if (showResult) return;
    showResult = true;
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }

    playSound(duelState.result === 'victory' ? 'victory' : 'defeat');

    // Save results
    const isWinner = duelState.result === 'victory';
    try {
      await saveDuelResult({
        room_id: roomId,
        player_id: userId,
        reps: duelState.myReps,
        max_combo: duelState.myMaxCombo,
        form_score_avg: formScore / 100,
        elapsed_secs: duelState.timeElapsedSecs,
        is_winner: isWinner,
        xp_earned: duelState.xpEarned,
      });
      await updateExerciseRecord(userId, exerciseId, duelState.myReps, duelState.myMaxCombo, isWinner);
      // Add XP via localStorage (same pattern as solo battles)
      const currentXP = parseInt(localStorage.getItem('pushquest_xp') ?? '0', 10);
      localStorage.setItem('pushquest_xp', String(currentXP + duelState.xpEarned));
    } catch (e) {
      console.error('Failed to save duel results:', e);
    }
  }

  function handleRematch() {
    rematchRequested = true;
    realtime?.send({ type: 'rematch_request', player_id: userId });
    if (opponentRematchRequested) startRematch();
  }

  function startRematch() {
    engine.reset();
    showResult = false;
    rematchRequested = false;
    opponentRematchRequested = false;
    formScore = 0;
    frameCount = 0;
    engine.setStatus('active');
    syncState();
    startTimer();
  }

  function startTimer() {
    secsLeft = timeLimit;
    timerHandle = setInterval(() => {
      engine.tick();
      syncState();

      if (secsLeft <= 0 && amHost) {
        realtime?.send({ type: 'battle_end', player_id: userId, final_reps: duelState.myReps });
        engine.endBattle();
        syncState();
        endBattle();
      }
    }, 1000);
  }

  async function setupWebRTC() {
    if (!myCam && !opCam) return;
    webrtcPeer = createWebRTCPeer();

    webrtcPeer.onIceCandidate = (candidate) => {
      realtime?.send({ type: 'ice_candidate', player_id: userId, candidate });
    };
    webrtcPeer.onRemoteStream = (stream) => {
      remoteStream = stream;
    };
    webrtcPeer.onConnectionFailed = () => {
      remoteStream = null;
    };

    if (myCam) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        });
        webrtcPeer.setLocalStream(stream);
      } catch { /* camera denied for sharing, still works for detection */ }
    }

    // Host initiates WebRTC offer
    if (amHost && (myCam || opCam)) {
      const offer = await webrtcPeer.createOffer();
      realtime?.send({ type: 'webrtc_offer', player_id: userId, sdp: offer });
    }
  }

  onMount(() => {
    if (!userId) { goto('/auth/login'); return; }
    if (!roomId) { goto('/duel'); return; }

    async function init() {
      // Wake lock
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch { /* not supported */ }

      // Setup realtime
      realtime = createDuelRealtime(supabase, roomId, {
        onEvent: handleEvent,
        onPresenceSync: handlePresenceSync,
      });
      realtime.trackPresence(userId);

      // Setup WebRTC
      await setupWebRTC();

      // Start engine
      engine.setExercise(exerciseId);
      engine.setTimeLimit(timeLimit);
      engine.setStatus('active');
      syncState();

      // Start timer
      startTimer();

      // Camera ready
      cameraActive = true;
    }

    init();

    return () => {
      if (timerHandle) clearInterval(timerHandle);
      if (disconnectTimer) clearTimeout(disconnectTimer);
      realtime?.destroy();
      webrtcPeer?.destroy();
      wakeLock?.release().catch(() => {});
    };
  });
</script>

<div class="fixed inset-0 bg-black flex flex-col {shaking ? 'animate-shake' : ''}">

  <!-- Timer bar -->
  <div class="flex items-center justify-center gap-3 py-2 bg-black/60 border-b border-white/10 z-20">
    <span class="text-2xl font-black tabular-nums text-white
      {secsLeft <= 10 ? 'text-red-500 animate-pulse' : ''}">
      {timerDisplay()}
    </span>
    <span class="text-white/30 font-bold text-sm">VS</span>
  </div>

  <!-- Split screen -->
  <div class="flex-1 flex flex-col min-h-0">

    <!-- Your side (top) -->
    <div class="relative flex-1 min-h-0 overflow-hidden">
      {#if cameraActive}
        <CameraDetection
          {exerciseConfig}
          active={duelState.status === 'active' && !showResult}
          paused={false}
          onRep={handleRep}
          onFormUpdate={handleFormUpdate}
          onLoadingMsg={(msg) => { loadingMsg = msg; }}
          onReady={() => { isLoading = false; }}
          onError={(msg) => { loadingMsg = msg; }}
        />
      {/if}

      <!-- Your rep counter -->
      <div class="absolute bottom-2 left-2 z-10 flex flex-col">
        <span class="text-4xl font-black text-white tabular-nums drop-shadow-lg">
          {duelState.myReps}
        </span>
        {#if getComboTier(duelState.myCombo)}
          <span class="text-xs font-bold text-orange-400 animate-pulse">
            {getComboTier(duelState.myCombo)}
          </span>
        {/if}
      </div>

      <!-- Form score -->
      <div class="absolute bottom-0 left-0 right-0 z-10">
        <FormScoreBar value={formScore} />
      </div>

      {#if isLoading}
        <div class="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
          <span class="text-white/60 text-sm animate-pulse">{loadingMsg}</span>
        </div>
      {/if}
    </div>

    <!-- Divider -->
    <div class="h-px bg-white/20"></div>

    <!-- Opponent side (bottom) -->
    <div class="relative flex-1 min-h-0 overflow-hidden">
      <OpponentView
        mode={opponentMode}
        keypoints={opponentKeypoints}
        {remoteStream}
        reps={duelState.opponentReps}
        combo={duelState.opponentCombo}
      />

      {#if opponentDisconnected}
        <div class="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <span class="text-white/60 text-sm animate-pulse">Adversaire deconnecte...</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Progress bar -->
  <div class="px-4 py-2 bg-black/60 border-t border-white/10">
    <DuelProgressBar myReps={duelState.myReps} opponentReps={duelState.opponentReps} />
  </div>

  <!-- Result overlay -->
  {#if showResult && duelState.result !== 'pending'}
    <DuelResultScreen
      result={duelState.result}
      myReps={duelState.myReps}
      opponentReps={duelState.opponentReps}
      myMaxCombo={duelState.myMaxCombo}
      xpEarned={duelState.xpEarned}
      onRematch={handleRematch}
      onNewDuel={() => goto('/duel')}
      onQuit={() => goto('/')}
    />
  {/if}
</div>

<style>
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }
  .animate-shake { animation: shake 150ms ease-in-out; }
</style>
