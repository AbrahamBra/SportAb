<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { createDuelRoom, joinDuelRoom } from '$lib/supabase/duel';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';

  let { data } = $props();

  let joinCode = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleCreate() {
    if (!data.session?.user) { goto('/auth/login'); return; }
    loading = true;
    error = '';
    try {
      const room = await createDuelRoom(data.session.user.id);
      goto(`/duel/${room.code}`);
    } catch (e: any) {
      error = e.message || 'Erreur lors de la creation';
    } finally {
      loading = false;
    }
  }

  async function handleJoin() {
    if (!data.session?.user) { goto('/auth/login'); return; }
    const code = joinCode.toUpperCase().trim();
    if (code.length !== 6) { error = 'Le code doit faire 6 caracteres'; return; }
    loading = true;
    error = '';
    try {
      const room = await joinDuelRoom(code);
      goto(`/duel/${room.code}`);
    } catch (e: any) {
      error = e.message === 'Room not found or already full'
        ? 'Salle introuvable ou deja pleine'
        : (e.message || 'Erreur lors de la connexion');
    } finally {
      loading = false;
    }
  }
</script>

<div class="relative min-h-screen flex flex-col items-center justify-center p-6">
  <BackgroundFX />

  <div class="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
    <!-- Title -->
    <div class="text-center">
      <h1 class="text-5xl font-black text-white tracking-wider">DUEL</h1>
      <p class="text-white/40 text-sm mt-1">1 vs 1 en temps reel</p>
    </div>

    <!-- Create -->
    <button
      onclick={handleCreate}
      disabled={loading}
      class="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95
        text-white font-bold text-lg transition-all shadow-lg shadow-red-600/30
        disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? '...' : 'CREER UN DUEL'}
    </button>

    <!-- Divider -->
    <div class="flex items-center gap-3 w-full">
      <div class="flex-1 h-px bg-white/10"></div>
      <span class="text-white/30 text-xs font-bold">OU</span>
      <div class="flex-1 h-px bg-white/10"></div>
    </div>

    <!-- Join -->
    <div class="flex gap-2 w-full">
      <input
        type="text"
        bind:value={joinCode}
        maxlength={6}
        placeholder="CODE"
        class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10
          text-white text-center text-lg font-mono tracking-widest uppercase
          placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
        onkeydown={(e) => e.key === 'Enter' && handleJoin()}
      />
      <button
        onclick={handleJoin}
        disabled={loading || joinCode.length < 6}
        class="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold
          transition-all disabled:opacity-30"
      >
        GO
      </button>
    </div>

    <!-- Error -->
    {#if error}
      <p class="text-red-400 text-sm text-center">{error}</p>
    {/if}

    <!-- Back -->
    <a href="/" class="text-white/30 hover:text-white/50 text-sm transition-colors">
      Retour
    </a>
  </div>
</div>
