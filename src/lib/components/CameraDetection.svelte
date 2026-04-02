<script lang="ts">
  import { onMount } from 'svelte';
  import { initDetector, detectPose, isDetectorReady } from '$lib/ai/pose-detector';
  import { createExerciseDetector, type ExerciseDetector } from '$lib/ai/exercise-detector';
  import type { ExerciseConfig } from '$lib/ai/exercises.config';

  // MoveNet skeleton connections
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

  let {
    exerciseConfig,
    active = false,
    paused = false,
    onRep,
    onFormUpdate,
    onLoadingMsg,
    onReady,
    onError,
  }: {
    exerciseConfig: ExerciseConfig;
    active: boolean;
    paused: boolean;
    onRep: () => void;
    onFormUpdate?: (score: number) => void;
    onLoadingMsg?: (msg: string) => void;
    onReady?: () => void;
    onError?: (msg: string) => void;
  } = $props();

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let videoEl: HTMLVideoElement | undefined = $state();
  let detector: ExerciseDetector | null = null;
  let animHandle = 0;
  let stream: MediaStream | null = null;

  // Store last detected keypoints so skeleton is drawn synchronously each frame
  let lastScaledKeypoints: { name: string; score: number; x: number; y: number }[] = [];
  let detecting = false;

  function renderLoop(): void {
    if (!active || !canvasEl || !videoEl) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    if (canvasEl.width !== canvasEl.offsetWidth) canvasEl.width = canvasEl.offsetWidth;
    if (canvasEl.height !== canvasEl.offsetHeight) canvasEl.height = canvasEl.offsetHeight;

    const W = canvasEl.width, H = canvasEl.height;

    // Draw mirrored video
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    if (videoEl.readyState >= 2) {
      const vw = videoEl.videoWidth || W, vh = videoEl.videoHeight || H;
      const scale = Math.max(W / vw, H / vh);
      const dw = vw * scale, dh = vh * scale;
      ctx.drawImage(videoEl, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
    ctx.restore();

    // Draw skeleton from last detection (synchronous — always visible)
    if (lastScaledKeypoints.length > 0) {
      const sm = Object.fromEntries(lastScaledKeypoints.map(k => [k.name, k]));
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (const [a, b] of CONNECTIONS) {
        const ka = sm[a], kb = sm[b];
        if (ka && kb && ka.score > 0.3 && kb.score > 0.3) {
          ctx.beginPath(); ctx.strokeStyle = 'rgba(255,60,60,0.85)';
          ctx.moveTo(ka.x, ka.y); ctx.lineTo(kb.x, kb.y); ctx.stroke();
        }
      }
      for (const k of lastScaledKeypoints) {
        if (k.score > 0.3) {
          ctx.beginPath(); ctx.arc(k.x, k.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#ff3a3a'; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }
    }

    // Pose detection (async — updates stored keypoints for next frame)
    if (!paused && !detecting && videoEl.readyState >= 2 && isDetectorReady()) {
      detecting = true;
      detectPose(videoEl).then((keypoints) => {
        detecting = false;
        if (!active || !canvasEl || keypoints.length === 0) return;

        const cW = canvasEl.width, cH = canvasEl.height;
        const vw = videoEl!.videoWidth || cW, vh = videoEl!.videoHeight || cH;
        const scale = Math.max(cW / vw, cH / vh);
        const ox = (cW - vw * scale) / 2, oy = (cH - vh * scale) / 2;

        lastScaledKeypoints = keypoints.map(k => ({
          name: k.name, score: k.score,
          x: cW - (k.x * scale + ox), y: k.y * scale + oy,
        }));

        // Exercise detection
        if (detector) {
          const prevReps = detector.getReps();
          detector.processFrame(keypoints);
          const newReps = detector.getReps();
          if (onFormUpdate) onFormUpdate(detector.getFormScore() * 100);
          if (newReps > prevReps) onRep();
        }
      }).catch(() => { detecting = false; });
    }

    animHandle = requestAnimationFrame(renderLoop);
  }

  function stopCamera(): void {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (videoEl?.srcObject) { videoEl.srcObject = null; }
    cancelAnimationFrame(animHandle);
  }

  onMount(() => {
    detector = createExerciseDetector(exerciseConfig);

    async function init(): Promise<void> {
      onLoadingMsg?.('DEMARRAGE...');
      try {
        const [mediaStream] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          }),
          initDetector((msg) => { onLoadingMsg?.(msg.toUpperCase()); }),
        ]);
        stream = mediaStream;
        if (!videoEl) return;
        videoEl.srcObject = stream;
        await videoEl.play();
        onReady?.();
        renderLoop();
      } catch (e) {
        const msg = (e as Error)?.message?.includes('Permission') ? 'CAMERA REFUSEE' : 'ECHEC CHARGEMENT';
        onError?.(msg);
      }
    }

    init();
    return () => { stopCamera(); };
  });

  // Restart loop when active changes
  $effect(() => {
    if (active && canvasEl && videoEl) {
      cancelAnimationFrame(animHandle);
      renderLoop();
    }
  });
</script>

<div class="relative w-full h-full">
  <video bind:this={videoEl} class="hidden" autoplay playsinline muted></video>
  <canvas bind:this={canvasEl} class="absolute inset-0 w-full h-full"></canvas>
</div>
