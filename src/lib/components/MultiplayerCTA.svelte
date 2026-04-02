<script lang="ts">
  const STORAGE_KEY = 'pushquest_cta_dismissed';

  let dismissed = $state(false);

  $effect(() => {
    dismissed = sessionStorage.getItem(STORAGE_KEY) === '1';
  });

  function dismiss(): void {
    dismissed = true;
    sessionStorage.setItem(STORAGE_KEY, '1');
  }
</script>

{#if !dismissed}
  <div
    class="w-full mb-6 border-2 border-[#FFD166]/30 bg-surface/60 rounded-xl backdrop-blur-sm relative px-5 py-4"
    style="animation: fadeInUp 0.5s 0.35s ease-out both"
  >
    <!-- Dismiss button -->
    <button
      class="absolute top-2 right-3 text-dim/40 hover:text-dim/70 transition-colors text-sm leading-none"
      onclick={dismiss}
      aria-label="Fermer"
    >✕</button>

    <!-- Content -->
    <div class="flex flex-col gap-1.5 pr-5">
      <p
        class="font-black text-[0.7rem] tracking-[3px] text-gold uppercase"
        style="text-shadow: 0 0 12px rgba(255,209,102,0.5)"
      >
        🔒 MODE MULTIJOUEUR VERROUILLE
      </p>
      <p class="text-[0.6rem] text-dim/60 font-mono tracking-[1px]">
        Connecte-toi pour debloquer : defis PvP, classement, code ami
      </p>
    </div>

    <!-- CTA button -->
    <a
      href="/auth/login"
      class="mt-3 inline-block -skew-x-3 bg-gold/15 border border-gold/40 text-gold
             font-black text-[0.65rem] tracking-[4px] uppercase px-5 py-2 rounded
             hover:bg-gold/25 active:scale-[0.97] transition-all"
    >
      REJOINDRE LA GUILDE
    </a>
  </div>
{/if}
