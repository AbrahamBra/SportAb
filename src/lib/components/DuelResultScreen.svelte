<script lang="ts">
  let {
    result = 'draw',
    myReps = 0,
    opponentReps = 0,
    myMaxCombo = 0,
    opponentMaxCombo = 0,
    xpEarned = 0,
    isNewRecord = false,
    onRematch,
    onNewDuel,
    onQuit,
  }: {
    result?: 'victory' | 'defeat' | 'draw';
    myReps?: number;
    opponentReps?: number;
    myMaxCombo?: number;
    opponentMaxCombo?: number;
    xpEarned?: number;
    isNewRecord?: boolean;
    onRematch?: () => void;
    onNewDuel?: () => void;
    onQuit?: () => void;
  } = $props();

  const titles: Record<string, string> = {
    victory: 'VICTOIRE!',
    defeat: 'DEFAITE',
    draw: 'EGALITE',
  };

  const titleColors: Record<string, string> = {
    victory: 'text-yellow-400',
    defeat: 'text-red-400',
    draw: 'text-white',
  };
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
  <div class="flex flex-col items-center gap-6 w-full max-w-sm px-6">

    <!-- Title -->
    <h1 class="text-4xl font-black {titleColors[result]} animate-bounce-in">
      {titles[result]}
    </h1>

    <!-- Stats comparison -->
    <div class="grid grid-cols-3 gap-2 w-full text-center">
      <div>
        <p class="text-2xl font-black text-red-400">{myReps}</p>
        <p class="text-xs text-white/50">TES REPS</p>
      </div>
      <div class="flex items-center justify-center">
        <span class="text-white/30 text-lg">VS</span>
      </div>
      <div>
        <p class="text-2xl font-black text-blue-400">{opponentReps}</p>
        <p class="text-xs text-white/50">SES REPS</p>
      </div>

      <div>
        <p class="text-lg font-bold text-orange-400">{myMaxCombo}x</p>
        <p class="text-xs text-white/50">COMBO</p>
      </div>
      <div></div>
      <div>
        <p class="text-lg font-bold text-orange-400">{opponentMaxCombo}x</p>
        <p class="text-xs text-white/50">COMBO</p>
      </div>
    </div>

    <!-- XP -->
    <div class="flex items-center gap-2">
      <span class="text-yellow-400 font-bold">+{xpEarned} XP</span>
      {#if isNewRecord}
        <span class="bg-yellow-400/20 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
          NOUVEAU RECORD!
        </span>
      {/if}
    </div>

    <!-- Actions -->
    <div class="flex flex-col gap-3 w-full">
      <button
        onclick={() => onRematch?.()}
        class="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg transition-colors"
      >
        REVANCHE
      </button>
      <button
        onclick={() => onNewDuel?.()}
        class="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
      >
        NOUVEAU DUEL
      </button>
      <button
        onclick={() => onQuit?.()}
        class="w-full py-2 text-white/40 hover:text-white/60 text-sm transition-colors"
      >
        Quitter
      </button>
    </div>
  </div>
</div>

<style>
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes bounce-in {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  .animate-fade-in { animation: fade-in 0.4s ease-out; }
  .animate-bounce-in { animation: bounce-in 0.5s ease-out; }
</style>
