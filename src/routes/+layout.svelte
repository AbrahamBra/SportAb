<script lang="ts">
  import '../app.css';
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { createClient } from '$lib/supabase/client';
  import { invalidateAll } from '$app/navigation';
  import { syncOnLogin } from '$lib/supabase/sync';
  import InstallPrompt from '$lib/components/InstallPrompt.svelte';

  let { data, children } = $props();
  const supabase = createClient();

  onMount(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      invalidateAll();
      // Sync localStorage → Supabase on sign-in
      if (event === 'SIGNED_IN') {
        syncOnLogin(supabase).catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  });
</script>

<div class="min-h-screen bg-background text-white font-sans">
  {#key page.url.pathname}
    <div in:fade={{ duration: 150 }}>
      {@render children()}
    </div>
  {/key}
</div>

<InstallPrompt />
