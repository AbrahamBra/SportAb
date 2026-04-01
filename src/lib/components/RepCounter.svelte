<script lang="ts">
  let { count, visible }: { count: number; visible: boolean } = $props();
  let animKey = $state(0);
  $effect(() => { if (count > 0) animKey++; });
</script>
{#if visible}
<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex flex-col items-center">
  {#key animKey}
  <span class="text-[80px] font-black text-gold leading-none" style="text-shadow: 0 0 30px rgba(255,209,102,0.5); animation: repPop 0.7s ease-out forwards">{count}</span>
  {/key}
  <span class="text-xs tracking-[5px] text-white/55 mt-1">DAMAGE DEALT</span>
</div>
{/if}
<style>
  @keyframes repPop {
    0% { transform: scale(1.5); opacity: 1; }
    60% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.9) translateY(-20px); opacity: 0; }
  }
</style>
