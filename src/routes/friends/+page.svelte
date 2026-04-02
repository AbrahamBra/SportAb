<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/supabase/client';
  import {
    getMyFriendCode, getFriendsList, addFriend, removeFriend,
    getPendingChallenges, getFriendsLeaderboard,
    type FriendInfo, type ChallengeInfo, type LeaderboardEntry,
  } from '$lib/supabase/friends';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';
  import FriendCodeDisplay from '$lib/components/FriendCodeDisplay.svelte';
  import FriendCodeInput from '$lib/components/FriendCodeInput.svelte';
  import FriendCard from '$lib/components/FriendCard.svelte';
  import ChallengeCard from '$lib/components/ChallengeCard.svelte';
  import LeaderboardTable from '$lib/components/LeaderboardTable.svelte';

  let isAuthenticated = $state(false);
  let loading = $state(true);
  let myCode = $state<string | null>(null);
  let friends = $state<FriendInfo[]>([]);
  let challenges = $state<ChallengeInfo[]>([]);
  let leaderboard = $state<LeaderboardEntry[]>([]);
  let userId = $state<string | undefined>(undefined);
  let addLoading = $state(false);
  let addResult = $state<{ success: boolean; message: string } | null>(null);

  // Tab state
  let activeTab = $state<'friends' | 'leaderboard' | 'challenges'>('friends');

  async function loadData(): Promise<void> {
    const [code, friendList, challengeList, lb] = await Promise.all([
      getMyFriendCode(),
      getFriendsList(),
      getPendingChallenges(),
      getFriendsLeaderboard(),
    ]);
    myCode = code;
    friends = friendList;
    challenges = challengeList;
    leaderboard = lb;
    loading = false;
  }

  async function handleAddFriend(code: string): Promise<void> {
    addLoading = true;
    addResult = null;
    const result = await addFriend(code);
    addLoading = false;
    if (result.success) {
      addResult = { success: true, message: `${result.friend_name} ajoute !` };
      // Refresh friends list
      friends = await getFriendsList();
    } else {
      addResult = { success: false, message: result.error ?? 'Erreur inconnue' };
    }
    setTimeout(() => { addResult = null; }, 3000);
  }

  async function handleRemoveFriend(friendId: string): Promise<void> {
    const confirmed = true; // In real app: show confirmation modal
    if (confirmed) {
      await removeFriend(friendId);
      friends = friends.filter(f => f.id !== friendId);
    }
  }

  function handleChallengeFriend(friendId: string): void {
    // Navigate to battle with challenge params
    goto(`/battle?challenge_friend=${friendId}`);
  }

  function handleAcceptChallenge(challenge: ChallengeInfo): void {
    goto(`/battle?boss=${challenge.boss_id}&exercise=${challenge.exercise_type}&challenge=${challenge.id}`);
  }

  onMount(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      isAuthenticated = true;
      userId = session.user.id;
      await loadData();
    } else {
      loading = false;
    }
  });
</script>

<BackgroundFX />

<div class="relative z-10 flex flex-col items-center min-h-screen px-6 pt-10 pb-24 max-w-[420px] mx-auto">

  <!-- Header -->
  <div class="w-full flex items-center justify-end mb-6"
    style="animation: fadeInDown 0.5s ease-out both">
    <div class="flex items-center gap-2">
      <span class="w-1.5 h-1.5 rounded-full bg-primary"
        style="animation: statusDot 1.5s ease-in-out infinite; box-shadow: 0 0 6px rgba(230,57,70,0.9)"></span>
      <span class="font-mono text-[0.6rem] tracking-[4px] text-primary/70 uppercase">SOCIAL</span>
    </div>
  </div>

  <!-- Title -->
  <h1 class="text-[1.8rem] font-black tracking-[4px] uppercase leading-none italic mb-1"
    style="text-shadow: 0 0 20px rgba(230,57,70,0.55); animation: fadeInDown 0.6s 0.05s ease-out both">
    Amis
  </h1>
  <p class="font-mono text-[0.6rem] tracking-[5px] text-dim/60 uppercase mb-7"
    style="animation: systemBoot 0.8s 0.3s ease-out both">
    ◆ Combat ensemble ◆
  </p>

  {#if !isAuthenticated}
    <!-- Not logged in -->
    <div class="w-full flex flex-col items-center gap-5 mt-8" style="animation: fadeInUp 0.5s 0.3s ease-out both">
      <div class="text-5xl mb-2">🔒</div>
      <p class="text-sm text-dim/70 text-center leading-relaxed">
        Connecte-toi pour acceder aux fonctionnalites sociales : amis, defis et classement.
      </p>
      <a href="/auth/login"
        class="w-full py-4 bg-primary text-white font-black rounded-[14px] text-[0.9rem] tracking-[4px] uppercase text-center
          hover:bg-primary-hover active:scale-[0.97] transition-all shadow-[0_0_20px_rgba(230,57,70,0.3)]">
        SE CONNECTER
      </a>
    </div>

  {:else if loading}
    <p class="font-mono text-dim/60 tracking-[3px] text-sm mt-10"
      style="animation: systemBoot 0.5s ease-out both">CHARGEMENT...</p>

  {:else}
    <!-- Friend code -->
    {#if myCode}
      <div class="w-full mb-5" style="animation: fadeInUp 0.5s 0.35s ease-out both">
        <FriendCodeDisplay code={myCode} />
      </div>
    {/if}

    <!-- Add friend -->
    <div class="w-full mb-5" style="animation: fadeInUp 0.5s 0.4s ease-out both">
      <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase mb-2">◆ Ajouter un ami</p>
      <FriendCodeInput onSubmit={handleAddFriend} loading={addLoading} />
      {#if addResult}
        <p class="text-[0.6rem] font-mono tracking-[1px] mt-1.5
          {addResult.success ? 'text-success' : 'text-primary'}"
          style="animation: fadeInUp 0.2s ease-out both">
          {addResult.message}
        </p>
      {/if}
    </div>

    <!-- Tabs -->
    <div class="flex gap-1.5 w-full mb-4" style="animation: fadeInUp 0.5s 0.45s ease-out both">
      {#each [
        { id: 'friends' as const, label: 'Amis', count: friends.length },
        { id: 'leaderboard' as const, label: 'Classement', count: null },
        { id: 'challenges' as const, label: 'Defis', count: challenges.length },
      ] as tab}
        <button
          class="flex-1 py-2 rounded-lg text-[0.6rem] font-bold tracking-[2px] uppercase transition-all -skew-x-3
            {activeTab === tab.id
              ? 'bg-primary/90 text-white border-l-2 border-primary shadow-[0_0_10px_rgba(230,57,70,0.2)]'
              : 'bg-surface/80 border border-white/10 text-dim hover:border-primary/40'}"
          onclick={() => { activeTab = tab.id; }}
        >
          <span class="inline-block skew-x-3">
            {tab.label}
            {#if tab.count && tab.count > 0}
              <span class="ml-0.5 text-[0.5rem] opacity-70">({tab.count})</span>
            {/if}
          </span>
        </button>
      {/each}
    </div>

    <!-- Tab content -->
    <div class="w-full" style="animation: fadeInUp 0.5s 0.5s ease-out both">
      {#if activeTab === 'friends'}
        <div class="relative">
          <div class="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-primary/50"></div>
          <div class="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-primary/50"></div>
          <div class="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-primary/50"></div>
          <div class="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-primary/50"></div>

          {#if friends.length === 0}
            <div class="text-center py-10">
              <p class="text-3xl mb-3">👥</p>
              <p class="text-[0.65rem] text-dim/50 font-mono tracking-[1px] leading-relaxed">
                Aucun allie dans ta guilde. Partage ton code pour recruter ! ⚔️
              </p>
            </div>
          {:else}
            <div class="flex flex-col gap-1.5">
              {#each friends as friend, i}
                <div style="animation: slideInLeft 0.3s {0.04 * i}s ease-out both">
                  <FriendCard
                    {friend}
                    onRemove={handleRemoveFriend}
                    onChallenge={handleChallengeFriend}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'leaderboard'}
        <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/80 uppercase mb-2.5">◆ Classement hebdo</p>
        <LeaderboardTable entries={leaderboard} currentUserId={userId} />

      {:else if activeTab === 'challenges'}
        {#if challenges.length === 0}
          <div class="text-center py-10">
            <p class="text-3xl mb-3">⚔️</p>
            <p class="text-[0.65rem] text-dim/50 font-mono tracking-[1px] leading-relaxed">
              Aucun rival a l'horizon. Defie un ami apres ton prochain combat ⚔️
            </p>
          </div>
        {:else}
          <div class="flex flex-col gap-2">
            {#each challenges as challenge, i}
              <div style="animation: slideInLeft 0.3s {0.04 * i}s ease-out both">
                <ChallengeCard {challenge} onAccept={handleAcceptChallenge} />
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  {/if}

</div>
