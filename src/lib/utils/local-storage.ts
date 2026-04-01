const BATTLE_STATE_KEY = 'pushquest_battle_state';

export interface SavedBattleState {
  bossId: string;
  exerciseType: string;
  bossHP: number;
  reps: number;
  timeElapsedSecs: number;
  savedAt: number;
}

export function saveBattleState(state: SavedBattleState): void {
  try { localStorage.setItem(BATTLE_STATE_KEY, JSON.stringify(state)); } catch {}
}

export function loadBattleState(): SavedBattleState | null {
  try {
    const raw = localStorage.getItem(BATTLE_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as SavedBattleState;
    if (Date.now() - state.savedAt > 10 * 60 * 1000) { clearBattleState(); return null; }
    return state;
  } catch { return null; }
}

export function clearBattleState(): void {
  try { localStorage.removeItem(BATTLE_STATE_KEY); } catch {}
}
