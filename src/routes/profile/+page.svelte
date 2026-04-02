<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { computeLevel, xpForNextLevel } from '$lib/game/progression';
  import BackgroundFX from '$lib/components/BackgroundFX.svelte';
  import XPBar from '$lib/components/XPBar.svelte';

  interface BattleRecord {
    bossId: string; bossName: string; result: string; reps: number; date: string;
  }

  let totalXP = $state(0);
  let playerLevel = $derived(computeLevel(totalXP));
  let displayName = $state('Guerrier');
  let battleHistory = $state<BattleRecord[]>([]);

  const totalReps   = $derived(battleHistory.reduce((sum, b) => sum + b.reps, 0));
  const bossesSlain = $derived(battleHistory.filter((b) => b.result === 'victory').length);
  const totalFights = $derived(battleHistory.length);
  const winRate     = $derived(totalFights > 0 ? Math.round((bossesSlain / totalFights) * 100) : 0);
  const currentStreak = $derived(() => {
    let streak = 0;
    for (const b of battleHistory) { if (b.result === 'victory') streak++; else break; }
    return streak;
  });

  // SVG ring (140px diameter, r=62)
  const CIRCUMFERENCE = 2 * Math.PI * 62; // ≈ 389.6
  const xpNext = $derived(xpForNextLevel(playerLevel));
  const xpCurrent = $derived(totalXP - (playerLevel > 1 ? xpForNextLevel(playerLevel - 1) : 0));
  const ringProgress = $derived(Math.min(xpCurrent / xpNext, 1));
  const ringOffset   = $derived(CIRCUMFERENCE * (1 - ringProgress));

  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr); const now = new Date();
      const m = Math.floor((now.getTime() - d.getTime()) / 60000);
      const h = Math.floor(m / 60); const day = Math.floor(m / 1440);
      if (m < 1) return 'A l\'instant';
      if (m < 60) return `Il y a ${m}min`;
      if (h < 24) return `Il y a ${h}h`;
      if (day < 7) return `Il y a ${day}j`;
      return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  }

  function difficultyColor(bossId: string): string {
    const map: Record<string, string> = {
      goblin: 'text-success', orc: 'text-gold',
      troll: 'text-primary', titan: 'text-[#c084fc]'
    };
    return map[bossId] ?? 'text-white';
  }

  onMount(() => {
    const savedXP = localStorage.getItem('pushquest_xp');
    if (savedXP) totalXP = parseInt(savedXP, 10) || 0;
    const savedName = localStorage.getItem('pushquest_name');
    if (savedName) displayName = savedName;
    try {
      const raw = localStorage.getItem('pushquest_history');
      if (raw) battleHistory = JSON.parse(raw) as BattleRecord[];
    } catch {}
  });
</script>

<BackgroundFX />

<div class="relative z-10 flex flex-col min-h-screen px-6 pt-8 pb-10 max-w-[420px] mx-auto">

  <!-- Back -->
  <button
    class="self-start flex items-center gap-2 text-sm font-mono text-dim/70 tracking-[3px] hover:text-primary/80 transition-colors mb-6"
    style="animation: fadeInDown 0.4s ease-out both"
    onclick={() => goto('/')}
  >
    ← RETOUR
  </button>

  <!-- System label -->
  <div class="flex items-center gap-2 mb-6 self-center"
    style="animation: systemBoot 0.7s 0.1s ease-out both">
    <span class="w-1.5 h-1.5 rounded-full bg-gold"
      style="animation: statusDot 2s ease-in-out infinite; box-shadow: 0 0 6px color-mix(in srgb, var(--color-gold) 80%, transparent)"></span>
    <span class="font-mono text-[0.58rem] tracking-[5px] text-gold/60 uppercase">SHADOW_SOLDIER · PROFIL</span>
  </div>

  <!-- Player identity -->
  <div class="flex flex-col items-center text-center mb-8"
    style="animation: fadeInUp 0.5s 0.15s ease-out both">

    <!-- SVG progress ring -->
    <div class="relative w-[120px] h-[120px] mb-4">
      <svg class="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <!-- Track -->
        <circle cx="70" cy="70" r="62" stroke="rgba(255,255,255,0.06)" stroke-width="5" fill="none"/>
        <!-- Progress -->
        <circle cx="70" cy="70" r="62"
          stroke="#E63946" stroke-width="5" fill="none"
          stroke-linecap="round"
          stroke-dasharray="{CIRCUMFERENCE}"
          stroke-dashoffset="{ringOffset}"
          style="filter: drop-shadow(0 0 6px rgba(230,57,70,0.7)); transition: stroke-dashoffset 0.8s ease"
        />
      </svg>
      <!-- Center -->
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="font-mono font-black text-3xl text-primary leading-none"
          style="text-shadow: 0 0 20px rgba(230,57,70,0.7)">{playerLevel}</span>
        <span class="font-mono text-[0.5rem] tracking-[3px] text-dim/60 uppercase mt-0.5">NIVEAU</span>
      </div>
    </div>

    <h1 class="text-xl font-black tracking-[4px] uppercase italic">{displayName}</h1>
    <p class="font-mono text-[0.58rem] text-dim/60 tracking-[4px] mt-1 uppercase">◆ Niveau {playerLevel} Guerrier ◆</p>
  </div>

  <!-- XP Bar -->
  <div class="w-full mb-8" style="animation: fadeInUp 0.5s 0.25s ease-out both">
    <XPBar xp={totalXP} level={playerLevel} />
  </div>

  <!-- Stats Grid -->
  <div class="relative mb-8" style="animation: fadeInUp 0.5s 0.35s ease-out both">
    <!-- Corner brackets -->
    <div class="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-primary/40"></div>
    <div class="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-primary/40"></div>
    <div class="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-primary/40"></div>
    <div class="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-primary/40"></div>

    <div class="grid grid-cols-2 gap-2.5">
      {#each [
        { val: totalReps,       label: 'Reps Totales',  color: 'text-white',   border: 'border-white/20' },
        { val: bossesSlain,     label: 'Boss Vaincus',  color: 'text-primary', border: 'border-primary/40' },
        { val: `${winRate}%`,   label: 'Taux Victoire', color: 'text-gold',    border: 'border-gold/40' },
        { val: currentStreak(), label: 'Serie',         color: 'text-success', border: 'border-success/40' },
      ] as stat, i}
        <div class="relative bg-surface/80 border-l-2 {stat.border} rounded-lg px-4 py-4 text-center overflow-hidden -skew-x-[4deg]"
          style="animation: fadeInUp 0.4s {0.05 * i + 0.4}s ease-out both">
          <!-- Scan line bg -->
          <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_6px] pointer-events-none"></div>
          <p class="font-mono text-2xl font-black {stat.color} skew-x-[4deg]"
            style="{stat.color === 'text-primary' ? 'text-shadow: 0 0 15px rgba(230,57,70,0.5)' : stat.color === 'text-gold' ? 'text-shadow: 0 0 15px rgba(255,209,102,0.5)' : ''}"
          >{stat.val}</p>
          <p class="font-mono text-[0.55rem] tracking-[3px] text-dim/60 uppercase mt-1 skew-x-[4deg]">{stat.label}</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- Battle History -->
  <div class="flex-1" style="animation: fadeInUp 0.5s 0.55s ease-out both">
    <p class="font-mono text-[0.58rem] tracking-[5px] text-dim/60 uppercase mb-3">◆ Historique des Combats</p>

    {#if battleHistory.length === 0}
      <div class="bg-surface/60 border border-white/5 rounded-lg p-6 text-center">
        <p class="font-mono text-xs text-dim/50 tracking-[2px]">AUCUN COMBAT. CHOISIS UN BOSS ET BATS-TOI.</p>
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each battleHistory.slice(0, 20) as record, i}
          <div class="relative bg-surface/70 rounded-lg px-4 py-3 flex items-center justify-between
            border-l-2 {record.result === 'victory' ? 'border-success' : 'border-primary'}
            -skew-x-[3deg] overflow-hidden"
            style="animation: slideInLeft 0.4s {0.04 * i + 0.6}s ease-out both">
            <div class="flex flex-col gap-0.5 skew-x-[3deg]">
              <span class="font-black tracking-[2px] uppercase text-sm {difficultyColor(record.bossId)}">{record.bossName}</span>
              <span class="font-mono text-xs text-dim/60">{record.reps} reps · {formatDate(record.date)}</span>
            </div>
            <span class="font-mono text-xs font-bold tracking-[2px] uppercase px-2.5 py-1 rounded skew-x-[3deg]
              {record.result === 'victory'
                ? 'bg-success/15 text-success border border-success/25'
                : 'bg-primary/15 text-primary border border-primary/25'}">
              {record.result === 'victory' ? 'V' : 'D'}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
