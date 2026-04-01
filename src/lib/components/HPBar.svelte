<script lang="ts">
  let { current, max }: { current: number; max: number } = $props();
  const pct = $derived((current / max) * 100);
</script>
<div>
  <div class="h-3 bg-white/10 rounded-full overflow-hidden">
    <div class="h-full bg-gradient-to-r from-primary-active to-primary rounded-full transition-[width] duration-350 ease-out" style="width: {pct}%"></div>
  </div>
  <p class="mt-1 text-right text-xs text-dim tracking-[2px]">{current} / {max}</p>
</div>
