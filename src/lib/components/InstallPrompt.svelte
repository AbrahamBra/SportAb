<script lang="ts">
  import { onMount } from 'svelte';
  import CloseIcon from '$lib/components/icons/CloseIcon.svelte';

  let show = $state(false);
  let deferredPrompt: any = null;

  onMount(() => {
    // Check if dismissed recently
    const dismissed = localStorage.getItem('pushquest_install_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 3600000) return;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      show = true;
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  });

  async function install(): Promise<void> {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') show = false;
    deferredPrompt = null;
  }

  function dismiss(): void {
    show = false;
    localStorage.setItem('pushquest_install_dismissed', String(Date.now()));
  }
</script>

{#if show}
  <div class="fixed bottom-4 left-4 right-4 z-50 max-w-[420px] mx-auto"
    style="animation: fadeInUp 0.4s ease-out both">
    <div class="bg-surface/95 backdrop-blur-md border border-white/[0.1] rounded-xl px-4 py-3 flex items-center gap-3
      shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      <div class="flex-1">
        <p class="text-[0.7rem] font-bold text-white tracking-[1px]">Installe PushQuest</p>
        <p class="text-[0.55rem] text-dim/50 font-mono">Acces rapide + mode hors-ligne</p>
      </div>
      <button
        class="shrink-0 py-2 px-4 bg-primary text-white font-bold text-[0.6rem] tracking-[2px] uppercase rounded-lg
          hover:bg-primary-hover active:scale-95 transition-all"
        onclick={install}
      >
        INSTALLER
      </button>
      <button
        class="shrink-0 text-dim/30 hover:text-dim/60 transition-colors text-sm"
        onclick={dismiss}
      ><CloseIcon /></button>
    </div>
  </div>
{/if}
