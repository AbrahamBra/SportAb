<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { initDetector, detectPose, isDetectorReady } from '$lib/ai/pose-detector';
  import { createExerciseDetector, type ExerciseDetector } from '$lib/ai/exercise-detector';
  import { EXERCISES } from '$lib/ai/exercises.config';
  import { playSound, preloadSounds } from '$lib/game/audio';
  import Stars from '$lib/components/Stars.svelte';

  // Step management
  let step = $state(0);
  const totalSteps = 5;

  // Camera state
  let videoEl: HTMLVideoElement | undefined = $state();
  let canvasEl: HTMLCanvasElement | undefined = $state();
  let cameraStream: MediaStream | null = $state(null);
  let cameraError = $state('');
  let bodyDetected = $state(false);

  // Test reps state
  let testReps = $state(0);
  let exerciseDetector: ExerciseDetector | null = $state(null);
  let animHandle = 0;
  let detectionActive = false;

  // Model loading
  let modelLoading = $state(false);
  let modelReady = $state(false);

  const stepLabels = ['Disclaimer', 'Camera Setup', 'Pose Check', 'Test Reps', 'Ready'];

  function nextStep(): void {
    if (step < totalSteps - 1) {
      step++;
    }
  }

  async function requestCamera(): Promise<void> {
    cameraError = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      cameraStream = stream;
      // Move to pose check step
      step = 2;
    } catch (e) {
      cameraError = 'Camera permission denied. Please allow camera access and try again.';
    }
  }

  // Start model loading as soon as step 1 is reached (background warm-up)
  $effect(() => {
    if (step >= 1 && !modelReady && !modelLoading) {
      modelLoading = true;
      initDetector().then(() => {
        modelReady = true;
        modelLoading = false;
      }).catch(() => {
        modelLoading = false;
      });
    }
  });

  // Start the camera feed on pose check step
  $effect(() => {
    if (step === 2 && videoEl && cameraStream) {
      videoEl.srcObject = cameraStream;
      videoEl.play().catch(() => {});
    }
  });

  // Detection loop for pose check and test reps
  $effect(() => {
    if ((step === 2 || step === 3) && videoEl && modelReady) {
      detectionActive = true;

      if (step === 3 && !exerciseDetector) {
        exerciseDetector = createExerciseDetector(EXERCISES['pushup']!);
      }

      function loop(): void {
        if (!detectionActive || !videoEl) return;

        detectPose(videoEl).then((keypoints) => {
          if (!detectionActive) return;

          if (step === 2) {
            // Check if body is visible (at least 5 keypoints with good score)
            const goodKps = keypoints.filter((k) => k.score > 0.3);
            bodyDetected = goodKps.length >= 5;
          }

          if (step === 3 && exerciseDetector && keypoints.length > 0) {
            const prevReps = exerciseDetector.getReps();
            exerciseDetector.processFrame(keypoints);
            const newReps = exerciseDetector.getReps();
            testReps = newReps;
            if (newReps > prevReps) {
              playSound('rep');
            }
          }
        }).catch(() => {});

        // Draw camera to canvas (mirrored)
        if (canvasEl && videoEl && videoEl.readyState >= 2) {
          const ctx = canvasEl.getContext('2d');
          if (ctx) {
            if (canvasEl.width !== canvasEl.offsetWidth) canvasEl.width = canvasEl.offsetWidth;
            if (canvasEl.height !== canvasEl.offsetHeight) canvasEl.height = canvasEl.offsetHeight;
            const W = canvasEl.width;
            const H = canvasEl.height;
            ctx.save();
            ctx.translate(W, 0);
            ctx.scale(-1, 1);
            const vw = videoEl.videoWidth || W;
            const vh = videoEl.videoHeight || H;
            const scale = Math.max(W / vw, H / vh);
            const dw = vw * scale;
            const dh = vh * scale;
            ctx.drawImage(videoEl, (W - dw) / 2, (H - dh) / 2, dw, dh);
            ctx.restore();
          }
        }

        animHandle = requestAnimationFrame(loop);
      }

      loop();

      return () => {
        detectionActive = false;
        cancelAnimationFrame(animHandle);
      };
    }
  });

  function finishOnboarding(): void {
    localStorage.setItem('pushquest_onboarded', 'true');
    // Stop camera
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    detectionActive = false;
    cancelAnimationFrame(animHandle);
    goto('/');
  }

  function skipToReady(): void {
    step = 4;
  }

  onMount(() => {
    preloadSounds();

    // If already onboarded, go home
    if (localStorage.getItem('pushquest_onboarded')) {
      goto('/');
      return;
    }

    return () => {
      detectionActive = false;
      cancelAnimationFrame(animHandle);
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  });
</script>

<Stars />

<div class="relative z-10 flex flex-col items-center min-h-screen px-6 pt-12 pb-10 max-w-[420px] mx-auto">
  <!-- Progress dots -->
  <div class="flex gap-2 mb-8">
    {#each stepLabels as _, i}
      <div class="w-2 h-2 rounded-full transition-all {i === step ? 'bg-primary scale-125 dot-active' : i < step ? 'bg-primary/50' : 'bg-white/15'}"></div>
    {/each}
  </div>

  <!-- Step 0: Health Disclaimer -->
  {#if step === 0}
    <div class="flex flex-col items-center text-center gap-6 animate-fade-in">
      <div class="text-4xl mb-2">⚠️</div>
      <h1 class="text-2xl font-black uppercase tracking-[3px]">Health Disclaimer</h1>
      <div class="backdrop-blur-sm bg-surface/80 border border-white/10 rounded-[14px] p-5 text-sm text-dim leading-relaxed">
        <p>PushQuest provides gamified exercise tracking, not medical advice.</p>
        <p class="mt-3">Consult a physician before starting any exercise program. Stop immediately if you feel dizzy, short of breath, or experience pain.</p>
        <p class="mt-3">By continuing, you acknowledge that you exercise at your own risk.</p>
      </div>
      <button
        class="w-full py-4 bg-primary text-white font-black rounded-[14px] tracking-[4px] uppercase hover:bg-primary-hover active:scale-[0.98] transition-all"
        onclick={nextStep}
      >
        I UNDERSTAND
      </button>
    </div>
  {/if}

  <!-- Step 1: Camera Setup Guide -->
  {#if step === 1}
    <div class="flex flex-col items-center text-center gap-6 animate-fade-in">
      <div class="text-4xl mb-2">📷</div>
      <h1 class="text-2xl font-black uppercase tracking-[3px]">Camera Setup</h1>
      <div class="bg-surface rounded-[14px] p-5 w-full">
        <div class="flex flex-col gap-4 text-sm text-left">
          <div class="flex items-start gap-3">
            <span class="text-primary font-black text-lg leading-none mt-0.5">1</span>
            <span class="text-dim">Place your phone <strong class="text-white">3-6 feet away</strong>, slightly elevated</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-primary font-black text-lg leading-none mt-0.5">2</span>
            <span class="text-dim">We need to see your <strong class="text-white">full body</strong> in the frame</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-primary font-black text-lg leading-none mt-0.5">3</span>
            <span class="text-dim">Good lighting helps the AI <strong class="text-white">track your movement</strong></span>
          </div>
        </div>
      </div>
      {#if cameraError}
        <p class="text-primary text-sm">{cameraError}</p>
      {/if}
      <button
        class="w-full py-4 bg-primary text-white font-black rounded-[14px] tracking-[4px] uppercase hover:bg-primary-hover active:scale-[0.98] transition-all"
        onclick={requestCamera}
      >
        ALLOW CAMERA
      </button>
    </div>
  {/if}

  <!-- Step 2: Pose Check -->
  {#if step === 2}
    <div class="flex flex-col items-center text-center gap-4 w-full animate-fade-in">
      <h1 class="text-xl font-black uppercase tracking-[3px]">Pose Check</h1>
      <p class="text-sm text-dim">Stand in frame so the AI can see you</p>

      <div class="relative w-full aspect-[3/4] bg-black rounded-[14px] overflow-hidden">
        <video bind:this={videoEl} class="hidden" autoplay playsinline muted></video>
        <canvas bind:this={canvasEl} class="w-full h-full"></canvas>

        <!-- Detection status badge -->
        <div class="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold tracking-[2px] uppercase
          {bodyDetected ? 'bg-success/20 text-success border border-success/30' : 'bg-white/10 text-dim border border-white/10'}">
          {bodyDetected ? 'BODY DETECTED' : modelLoading ? 'LOADING AI...' : 'STAND IN FRAME'}
        </div>
      </div>

      <button
        class="w-full py-4 bg-primary text-white font-black rounded-[14px] tracking-[4px] uppercase hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        onclick={nextStep}
        disabled={!bodyDetected}
      >
        CONTINUE
      </button>
      <button
        class="text-xs text-dim tracking-[2px] hover:text-white/60 transition-colors"
        onclick={skipToReady}
      >
        SKIP SETUP
      </button>
    </div>
  {/if}

  <!-- Step 3: Test Reps -->
  {#if step === 3}
    <div class="flex flex-col items-center text-center gap-4 w-full animate-fade-in">
      <h1 class="text-xl font-black uppercase tracking-[3px]">Test Reps</h1>
      <p class="text-sm text-dim">Do 3 push-ups to test the tracking</p>

      <div class="relative w-full aspect-[3/4] bg-black rounded-[14px] overflow-hidden">
        <canvas bind:this={canvasEl} class="w-full h-full"></canvas>

        <!-- Rep counter overlay -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
          <span class="font-mono text-4xl font-black text-gold leading-none" style="text-shadow: 0 0 20px rgba(255,209,102,0.6), 0 0 40px rgba(255,209,102,0.3)">{testReps}</span>
          <span class="text-xs tracking-[4px] text-white/50 mt-1">/ 3 REPS</span>
        </div>
      </div>

      <button
        class="w-full py-4 bg-primary text-white font-black rounded-[14px] tracking-[4px] uppercase hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        onclick={nextStep}
        disabled={testReps < 3}
      >
        {testReps >= 3 ? 'AWESOME! CONTINUE' : `${3 - testReps} MORE TO GO`}
      </button>
      <button
        class="text-xs text-dim tracking-[2px] hover:text-white/60 transition-colors"
        onclick={skipToReady}
      >
        SKIP
      </button>
    </div>
  {/if}

  <!-- Step 4: Ready! -->
  {#if step === 4}
    <div class="flex flex-col items-center text-center gap-6 animate-fade-in">
      <div class="text-5xl mb-2">⚔️</div>
      <h1 class="text-3xl font-black tracking-[4px] uppercase text-gold" style="text-shadow: 0 0 40px rgba(255,209,102,0.4)">
        YOU'RE READY!
      </h1>
      <p class="text-sm text-dim tracking-[1px]">Choose your first boss and start your quest</p>

      <div class="bg-surface rounded-[14px] p-5 w-full">
        <div class="flex flex-col gap-3 text-sm text-left">
          <div class="flex items-center gap-3">
            <span class="text-success" style="text-shadow: 0 0 8px rgba(255,209,102,0.5)">✓</span>
            <span class="text-dim">Health disclaimer accepted</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-success" style="text-shadow: 0 0 8px rgba(255,209,102,0.5)">✓</span>
            <span class="text-dim">Camera access granted</span>
          </div>
          {#if testReps >= 3}
            <div class="flex items-center gap-3">
              <span class="text-success" style="text-shadow: 0 0 8px rgba(255,209,102,0.5)">✓</span>
              <span class="text-dim">Push-up tracking verified</span>
            </div>
          {/if}
        </div>
      </div>

      <button
        class="w-full py-4 bg-primary text-white font-black rounded-[14px] tracking-[4px] uppercase hover:bg-primary-hover active:scale-[0.98] transition-all"
        onclick={finishOnboarding}
      >
        LET'S GO!
      </button>
    </div>
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out both;
  }

  @keyframes dotPulse {
    0%, 100% { box-shadow: 0 0 4px rgba(230,57,70,0.4); }
    50% { box-shadow: 0 0 10px rgba(230,57,70,0.8); }
  }
  .dot-active {
    animation: dotPulse 1.5s ease-in-out infinite;
  }
</style>
