<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { computeLevel, xpForNextLevel } from '$lib/game/progression';
  import Stars from '$lib/components/Stars.svelte';
  import XPBar from '$lib/components/XPBar.svelte';

  interface BattleRecord {
    bossId: string;
    bossName: string;
    result: string;
    reps: number;
    date: string;
  }

  // Player data
  let totalXP = $state(0);
  let playerLevel = $derived(computeLevel(totalXP));
  let displayName = $state('Warrior');
  let battleHistory = $state<BattleRecord[]>([]);

  // Computed stats
  const totalReps = $derived(battleHistory.reduce((sum, b) => sum + b.reps, 0));
  const bossesSlain = $derived(battleHistory.filter((b) => b.result === 'victory').length);
  const totalFights = $derived(battleHistory.length);
  const winRate = $derived(totalFights > 0 ? Math.round((bossesSlain / totalFights) * 100) : 0);

  // Streak calculation
  const currentStreak = $derived(() => {
    let streak = 0;
    for (const b of battleHistory) {
      if (b.result === 'victory') streak++;
      else break;
    }
    return streak;
  });

  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  function difficultyColor(bossId: string): string {
    switch (bossId) {
      case 'goblin': return 'text-success';
      case 'orc': return 'text-gold';
      case 'troll': return 'text-primary';
      case 'titan': return 'text-[#c084fc]';
      default: return 'text-white';
    }
  }

  onMount(() => {
    // Load XP
    const savedXP = localStorage.getItem('pushquest_xp');
    if (savedXP) {
      totalXP = parseInt(savedXP, 10) || 0;
    }

    // Load name
    const savedName = localStorage.getItem('pushquest_name');
    if (savedName) {
      displayName = savedName;
    }

    // Load battle history
    try {
      const raw = localStorage.getItem('pushquest_history');
      if (raw) {
        battleHistory = JSON.parse(raw) as BattleRecord[];
      }
    } catch {}
  });
</script>

<Stars />

<div class="relative z-10 flex flex-col min-h-screen px-6 pt-8 pb-10 max-w-[420px] mx-auto">
  <!-- Back button -->
  <button
    class="self-start flex items-center gap-2 text-sm text-dim tracking-[2px] hover:text-white/70 transition-colors mb-6"
    onclick={() => goto('/')}
  >
    <span class="text-lg leading-none">&larr;</span> BACK
  </button>

  <!-- Player identity -->
  <div class="flex flex-col items-center text-center mb-8">
    <!-- Level badge -->
    <div class="w-16 h-16 rounded-full bg-surface border-2 border-primary/40 flex items-center justify-center mb-3">
      <span class="text-2xl font-black text-primary">{playerLevel}</span>
    </div>
    <h1 class="text-xl font-black tracking-[3px] uppercase">{displayName}</h1>
    <p class="text-xs text-dim tracking-[2px] mt-1">LEVEL {playerLevel} WARRIOR</p>
  </div>

  <!-- XP Bar -->
  <div class="w-full mb-8">
    <XPBar xp={totalXP} level={playerLevel} />
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 gap-3 mb-8">
    <div class="bg-surface rounded-[14px] p-4 text-center">
      <p class="text-2xl font-black text-white">{totalReps}</p>
      <p class="text-[0.6rem] tracking-[3px] text-dim uppercase mt-1">Total Reps</p>
    </div>
    <div class="bg-surface rounded-[14px] p-4 text-center">
      <p class="text-2xl font-black text-primary">{bossesSlain}</p>
      <p class="text-[0.6rem] tracking-[3px] text-dim uppercase mt-1">Bosses Slain</p>
    </div>
    <div class="bg-surface rounded-[14px] p-4 text-center">
      <p class="text-2xl font-black text-gold">{winRate}<span class="text-sm text-dim">%</span></p>
      <p class="text-[0.6rem] tracking-[3px] text-dim uppercase mt-1">Win Rate</p>
    </div>
    <div class="bg-surface rounded-[14px] p-4 text-center">
      <p class="text-2xl font-black text-success">{currentStreak()}</p>
      <p class="text-[0.6rem] tracking-[3px] text-dim uppercase mt-1">Streak</p>
    </div>
  </div>

  <!-- Battle History -->
  <div class="flex-1">
    <p class="text-[0.6rem] tracking-[5px] text-dim uppercase mb-3">Battle History</p>

    {#if battleHistory.length === 0}
      <div class="bg-surface rounded-[14px] p-6 text-center">
        <p class="text-sm text-dim">No battles yet. Choose a boss and fight!</p>
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each battleHistory.slice(0, 20) as record}
          <div class="bg-surface rounded-[12px] px-4 py-3 flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <span class="font-bold tracking-[2px] uppercase text-sm {difficultyColor(record.bossId)}">{record.bossName}</span>
              <span class="text-xs text-dim">{record.reps} reps &middot; {formatDate(record.date)}</span>
            </div>
            <span class="text-xs font-bold tracking-[2px] uppercase px-2.5 py-1 rounded-full
              {record.result === 'victory'
                ? 'bg-success/15 text-success border border-success/25'
                : 'bg-primary/15 text-primary border border-primary/25'}">
              {record.result === 'victory' ? 'WIN' : 'LOSS'}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
