<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/supabase/client';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';

  let email = $state('');
  let loading = $state(false);
  let message = $state('');
  let isError = $state(false);

  const supabase = createClient();

  async function loginWithEmail(): Promise<void> {
    if (!email.trim()) return;
    loading = true;
    message = '';
    isError = false;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    loading = false;
    if (error) {
      message = 'Erreur : ' + error.message;
      isError = true;
    } else {
      message = 'Lien magique envoye ! Verifie tes emails.';
      isError = false;
    }
  }

  async function loginWithGoogle(): Promise<void> {
    loading = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      loading = false;
      message = 'Erreur Google : ' + error.message;
      isError = true;
    }
  }

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) goto('/');
  });
</script>

<BackgroundFX />

<div class="relative z-10 flex flex-col items-center min-h-screen px-6 pt-12 pb-10 max-w-[420px] mx-auto">

  <!-- Back -->
  <div class="w-full mb-8" style="animation: fadeInDown 0.5s ease-out both">
    <a href="/"
      class="font-mono text-[0.6rem] tracking-[3px] text-dim/60 hover:text-primary/70 transition-colors uppercase">
      ← RETOUR
    </a>
  </div>

  <!-- Logo -->
  <h1 class="text-[2rem] font-black tracking-[4px] uppercase italic mb-1"
    style="text-shadow: 0 0 20px rgba(230,57,70,0.55); animation: fadeInDown 0.6s 0.05s ease-out both">
    PushQuest
  </h1>
  <p class="font-mono text-[0.6rem] tracking-[5px] text-dim/60 uppercase mb-10"
    style="animation: systemBoot 0.8s 0.3s ease-out both">
    ◆ Connexion ◆
  </p>

  <!-- Google OAuth -->
  <div class="w-full mb-4" style="animation: fadeInUp 0.5s 0.35s ease-out both">
    <button
      class="w-full py-3.5 bg-white text-black font-bold rounded-[14px] text-[0.8rem] tracking-[1px]
        hover:bg-white/90 active:scale-[0.97] transition-all flex items-center justify-center gap-3
        disabled:opacity-40"
      onclick={loginWithGoogle}
      disabled={loading}
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continuer avec Google
    </button>
  </div>

  <!-- Divider -->
  <div class="w-full flex items-center gap-3 mb-4" style="animation: fadeInUp 0.5s 0.4s ease-out both">
    <div class="flex-1 h-px bg-white/[0.08]"></div>
    <span class="text-[0.55rem] text-dim/40 font-mono tracking-[2px]">OU</span>
    <div class="flex-1 h-px bg-white/[0.08]"></div>
  </div>

  <!-- Email Magic Link -->
  <div class="w-full flex flex-col gap-3" style="animation: fadeInUp 0.5s 0.45s ease-out both">
    <input
      type="email"
      bind:value={email}
      placeholder="ton@email.com"
      class="w-full bg-surface/80 border border-white/[0.1] rounded-lg px-4 py-3
        font-mono text-sm text-white placeholder:text-dim/30
        focus:outline-none focus:border-primary/50 transition-colors"
      onkeydown={(e) => { if (e.key === 'Enter') loginWithEmail(); }}
    />
    <button
      class="w-full py-3.5 bg-primary text-white font-black rounded-[14px] text-[0.8rem] tracking-[3px] uppercase
        hover:bg-primary-hover active:scale-[0.97] transition-all disabled:opacity-40
        shadow-[0_0_20px_rgba(230,57,70,0.3)]"
      onclick={loginWithEmail}
      disabled={loading || !email.trim()}
    >
      {loading ? '...' : 'ENVOYER LE LIEN MAGIQUE'}
    </button>
  </div>

  <!-- Message -->
  {#if message}
    <p class="mt-4 text-[0.65rem] font-mono tracking-[1px] text-center
      {isError ? 'text-primary' : 'text-success'}"
      style="animation: fadeInUp 0.2s ease-out both">
      {message}
    </p>
  {/if}

  <!-- Info -->
  <p class="mt-8 text-[0.55rem] text-dim/30 font-mono tracking-[0.5px] text-center leading-relaxed"
    style="animation: fadeInUp 0.5s 0.6s ease-out both">
    La connexion debloque les fonctionnalites sociales : amis, defis, classement. Ton progres local sera conserve.
  </p>
</div>
