<script lang="ts">
  import { onMount } from 'svelte';
  let container: HTMLDivElement;
  onMount(() => {
    for (let i = 0; i < 60; i++) {
      const star = document.createElement('div');
      const size = Math.random() * 2 + 1;
      star.className = 'absolute rounded-full bg-white';
      star.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation:twinkle ${2+Math.random()*3}s infinite alternate ${Math.random()*4}s;`;
      container.appendChild(star);
    }
  });
</script>
<div bind:this={container} class="fixed inset-0 pointer-events-none z-0"></div>
<style>
  @keyframes twinkle { from { opacity: 0.05 } to { opacity: 0.6 } }
</style>
