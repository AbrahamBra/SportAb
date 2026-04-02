<script lang="ts">
  let { current, max }: { current: number; max: number } = $props();
  const pct = $derived((current / max) * 100);
  const isCritical = $derived(pct < 30);
  const isLow = $derived(pct < 60);

  // Ghost bar: tracks previous HP with a delay
  let ghostPct = $state(100);
  let ghostTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    // When pct drops, delay the ghost bar catching up
    if (pct < ghostPct) {
      if (ghostTimer) clearTimeout(ghostTimer);
      ghostTimer = setTimeout(() => {
        ghostPct = pct;
      }, 600);
    } else {
      ghostPct = pct;
    }
  });
</script>

<div role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={max} aria-label="Vie du boss" style="container-type: inline-size">
  <div class="hp-bar-track relative h-3.5 bg-white/[0.06] rounded-sm overflow-hidden border border-white/[0.05]">
    <!-- Scan line texture -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none z-10"></div>

    <!-- Ghost bar (trailing damage indicator) -->
    <div
      class="absolute top-0 left-0 h-full rounded-sm transition-[width] duration-700 ease-out"
      style="
        width: {ghostPct}%;
        background: linear-gradient(to right, rgba(255,209,102,0.5), rgba(255,209,102,0.25));
      "
    ></div>

    <!-- Fill (actual HP) -->
    <div
      class="h-full rounded-sm transition-[width] duration-300 ease-out relative"
      style="
        width: {pct}%;
        background: linear-gradient(to right, #A0101A, #E63946);
        box-shadow: 0 0 {isCritical ? 20 : 8}px rgba(230,57,70,{isCritical ? 0.8 : 0.4});
        {isCritical ? 'animation: hpCritical 1s ease-in-out infinite' : ''}
      "
    ></div>
  </div>
  <p class="mt-1 text-right font-mono text-[0.65rem] tracking-[2px]
    {isCritical ? 'text-primary' : 'text-dim/60'}"
    style="{isCritical ? 'animation: timerPulse 1s ease-in-out infinite' : ''}"
  >{current} / {max}</p>
</div>

<style>
  @container (max-width: 200px) {
    .hp-bar-track {
      height: 0.625rem;
    }
    .hp-bar-track + p {
      font-size: 0.55rem;
    }
  }
</style>
