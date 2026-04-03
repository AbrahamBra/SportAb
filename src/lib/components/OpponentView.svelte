<script lang="ts">
  import SkeletonRenderer from './SkeletonRenderer.svelte';
  import { getComboTier } from '$lib/game/duel-engine';

  let {
    mode = 'skeleton',
    keypoints = null,
    remoteStream = null,
    reps = 0,
    combo = 0,
    username = 'Adversaire',
  }: {
    mode?: 'skeleton' | 'video';
    keypoints?: number[][] | null;
    remoteStream?: MediaStream | null;
    reps?: number;
    combo?: number;
    username?: string;
  } = $props();

  let videoEl: HTMLVideoElement | undefined = $state();
  let comboTier = $derived(getComboTier(combo));

  $effect(() => {
    if (videoEl && remoteStream) {
      videoEl.srcObject = remoteStream;
      videoEl.play().catch(() => {});
    }
  });
</script>

<div class="relative w-full h-full overflow-hidden bg-black/40 rounded-lg">
  <!-- Username -->
  <div class="absolute top-2 left-2 z-10 bg-black/60 px-2 py-0.5 rounded text-xs text-white/70">
    {username}
  </div>

  <!-- Video or Skeleton -->
  {#if mode === 'video' && remoteStream}
    <video
      bind:this={videoEl}
      class="w-full h-full object-cover"
      autoplay
      playsinline
      muted
      style="transform: scaleX(-1);"
    ></video>
    <!-- Skeleton overlay on video -->
    {#if keypoints}
      <div class="absolute inset-0">
        <SkeletonRenderer {keypoints} width={320} height={480} />
      </div>
    {/if}
  {:else if keypoints && keypoints.length > 0}
    <SkeletonRenderer {keypoints} width={320} height={480} />
  {:else}
    <div class="flex items-center justify-center w-full h-full">
      <span class="text-white/30 text-sm">En attente...</span>
    </div>
  {/if}

  <!-- Rep counter -->
  <div class="absolute bottom-2 left-0 right-0 flex flex-col items-center z-10">
    <span class="text-3xl font-black text-white tabular-nums drop-shadow-lg">{reps}</span>
    {#if comboTier}
      <span class="text-xs font-bold text-orange-400 animate-pulse">{comboTier}</span>
    {/if}
  </div>
</div>
