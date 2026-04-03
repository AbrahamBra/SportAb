<script lang="ts">
  import '../app.css';
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { createClient } from '$lib/supabase/client';
  import { invalidateAll } from '$app/navigation';
  import { syncOnLogin } from '$lib/supabase/sync';
  import InstallPrompt from '$lib/components/InstallPrompt.svelte';
  import TabBar from '$lib/components/TabBar.svelte';
  import ChallengeToast from '$lib/components/ChallengeToast.svelte';
  import { init as initChallengeStore, reset as resetChallengeStore } from '$lib/stores/challenges';

  let { data, children } = $props();
  const supabase = createClient();

  const showTabBar = $derived(
    !page.url.pathname.startsWith('/onboarding') &&
    !page.url.pathname.startsWith('/battle') &&
    !page.url.pathname.startsWith('/session/battle') &&
    !page.url.pathname.startsWith('/auth') &&
    !(page.url.pathname.includes('/duel/') && page.url.pathname.includes('/battle'))
  );

  onMount(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      invalidateAll();
      // Sync localStorage → Supabase on sign-in
      if (event === 'SIGNED_IN') {
        syncOnLogin(supabase).catch(() => {});
        const { data: { user } } = await supabase.auth.getUser();
        if (user) initChallengeStore(supabase, user.id);
      }
      if (event === 'SIGNED_OUT') {
        resetChallengeStore();
      }
    });
    return () => subscription.unsubscribe();
  });
</script>

<div class="min-h-screen bg-background text-white font-sans {showTabBar ? 'pb-20' : ''}">
  {#key page.url.pathname}
    <div in:fade={{ duration: 150 }}>
      {@render children()}
    </div>
  {/key}
</div>

{#if showTabBar}
  <TabBar />
  <ChallengeToast />
{/if}

<InstallPrompt />
