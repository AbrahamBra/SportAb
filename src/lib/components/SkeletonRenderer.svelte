<script lang="ts">
  import { onMount } from 'svelte';

  let {
    keypoints = [],
    width = 320,
    height = 480,
  }: {
    keypoints?: number[][];
    width?: number;
    height?: number;
  } = $props();

  // MoveNet keypoint names in order (index 0-16)
  const KEYPOINT_NAMES = [
    'nose','left_eye','right_eye','left_ear','right_ear',
    'left_shoulder','right_shoulder','left_elbow','right_elbow',
    'left_wrist','right_wrist','left_hip','right_hip',
    'left_knee','right_knee','left_ankle','right_ankle',
  ];

  const CONNECTIONS: [number, number][] = [
    [0,1],[0,2],[1,3],[2,4],    // face
    [5,6],                       // shoulders
    [5,7],[7,9],                 // left arm
    [6,8],[8,10],                // right arm
    [5,11],[6,12],               // torso
    [11,12],                     // hips
    [11,13],[13,15],             // left leg
    [12,14],[14,16],             // right leg
  ];

  let canvasEl: HTMLCanvasElement | undefined = $state();
  // Smoothed keypoints for interpolation
  let smoothed: number[][] = [];
  const LERP = 0.3;

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  $effect(() => {
    if (!canvasEl || !keypoints || keypoints.length === 0) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    canvasEl.width = width;
    canvasEl.height = height;

    // Interpolate for smooth motion
    if (smoothed.length !== keypoints.length) {
      smoothed = keypoints.map(k => [...k]);
    } else {
      for (let i = 0; i < keypoints.length; i++) {
        const s = smoothed[i];
        const k = keypoints[i];
        if (!s || !k || s.length < 3 || k.length < 3) continue;
        s[0] = lerp(s[0]!, k[0]!, LERP);
        s[1] = lerp(s[1]!, k[1]!, LERP);
        s[2] = k[2]!;
      }
    }

    ctx.clearRect(0, 0, width, height);

    // Draw connections
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,60,60,0.85)';
    for (const [a, b] of CONNECTIONS) {
      const ka = smoothed[a];
      const kb = smoothed[b];
      if (ka && kb && (ka[2] ?? 0) > 0.3 && (kb[2] ?? 0) > 0.3) {
        ctx.beginPath();
        ctx.moveTo((ka[0] ?? 0) * width, (ka[1] ?? 0) * height);
        ctx.lineTo((kb[0] ?? 0) * width, (kb[1] ?? 0) * height);
        ctx.stroke();
      }
    }

    // Draw joints
    for (const k of smoothed) {
      if (k && (k[2] ?? 0) > 0.3) {
        ctx.beginPath();
        ctx.arc((k[0] ?? 0) * width, (k[1] ?? 0) * height, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff3a3a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  });
</script>

<canvas
  bind:this={canvasEl}
  class="w-full h-full"
  style="background: rgba(0,0,0,0.3);"
></canvas>
