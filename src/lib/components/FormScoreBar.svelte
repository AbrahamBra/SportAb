<script lang="ts">
  let { value }: { value: number } = $props();
  const pct = $derived(Math.min(100, Math.max(0, value)));
</script>
<div class="h-1 bg-white/8 rounded-full overflow-hidden">
  <div class="h-full bg-success rounded-full transition-[width] duration-150" style="width: {pct}%"></div>
</div>
