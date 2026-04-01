<script lang="ts">
  let { current, max }: { current: number; max: number } = $props();
  const pct = $derived((current / max) * 100);
  const isCritical = $derived(pct < 30);
  const isLow = $derived(pct < 60);
</script>

<div>
  <div class="relative h-3.5 bg-white/[0.06] rounded-sm overflow-hidden border border-white/[0.05]">
    <!-- Scan line texture -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none z-10"></div>

    <!-- Fill -->
    <div
      class="h-full rounded-sm transition-[width] duration-500 ease-out relative"
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
