<script lang="ts">
  let {
    myReps = 0,
    opponentReps = 0,
  }: {
    myReps?: number;
    opponentReps?: number;
  } = $props();

  let total = $derived(myReps + opponentReps || 1);
  let myPercent = $derived(Math.round((myReps / total) * 100));
  let diff = $derived(myReps - opponentReps);
  let label = $derived(
    diff > 0 ? `TU MENES +${diff}` :
    diff < 0 ? `IL MENE +${Math.abs(diff)}` :
    'EGALITE'
  );
</script>

<div class="w-full">
  <div class="flex h-3 rounded-full overflow-hidden bg-white/10">
    <!-- Your progress (left, red) -->
    <div
      class="bg-red-500 transition-all duration-300"
      style="width: {myPercent}%"
    ></div>
    <!-- Opponent progress (right, blue) -->
    <div
      class="bg-blue-500 transition-all duration-300 flex-1"
    ></div>
  </div>
  <p class="text-center text-xs font-bold mt-1 tabular-nums
    {diff > 0 ? 'text-red-400' : diff < 0 ? 'text-blue-400' : 'text-white/60'}">
    {label}
  </p>
</div>
