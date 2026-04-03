export type DuelStatus = 'idle' | 'waiting' | 'room_ready' | 'countdown' | 'active' | 'finished' | 'rematch';

export interface DuelState {
  status: DuelStatus;
  myReps: number;
  opponentReps: number;
  myCombo: number;
  myMaxCombo: number;
  opponentCombo: number;
  timeElapsedSecs: number;
  timeLimitSecs: number;
  exerciseId: string;
  result: 'pending' | 'victory' | 'defeat' | 'draw';
  xpEarned: number;
  isNewRecord: boolean;
}

export interface DuelEngine {
  setStatus(status: DuelStatus): void;
  setExercise(exerciseId: string): void;
  setTimeLimit(secs: number): void;
  addMyRep(): void;
  updateOpponentReps(reps: number, combo: number): void;
  tick(): void;
  endBattle(): void;
  reset(): void;
  getState(): DuelState;
}

const COMBO_WINDOW_MS = 3000;
const BASE_XP = 50;
const WIN_BONUS = 25;
const DRAW_BONUS = 10;

export function createDuelEngine(timeLimitSecs: number = 60): DuelEngine {
  let status: DuelStatus = 'idle';
  let myReps = 0;
  let opponentReps = 0;
  let myCombo = 0;
  let myMaxCombo = 0;
  let opponentCombo = 0;
  let timeElapsedSecs = 0;
  let timeLimitSecsVal = timeLimitSecs;
  let exerciseId = '';
  let result: DuelState['result'] = 'pending';
  let lastRepTime = 0;

  function calcXP(): number {
    if (result === 'pending') return 0;
    const base = BASE_XP + myReps * 2;
    if (result === 'victory') return base + WIN_BONUS;
    if (result === 'draw') return base + DRAW_BONUS;
    return base;
  }

  function determineResult(): DuelState['result'] {
    if (myReps > opponentReps) return 'victory';
    if (myReps < opponentReps) return 'defeat';
    return 'draw';
  }

  return {
    setStatus(s: DuelStatus) { status = s; },
    setExercise(id: string) { exerciseId = id; },
    setTimeLimit(secs: number) { timeLimitSecsVal = secs; },

    addMyRep() {
      if (status !== 'active') return;
      myReps++;
      const now = Date.now();
      if (now - lastRepTime < COMBO_WINDOW_MS) {
        myCombo++;
      } else {
        myCombo = 1;
      }
      lastRepTime = now;
      if (myCombo > myMaxCombo) myMaxCombo = myCombo;
    },

    updateOpponentReps(reps: number, combo: number) {
      opponentReps = reps;
      opponentCombo = combo;
    },

    tick() {
      if (status !== 'active') return;
      timeElapsedSecs++;
    },

    endBattle() {
      if (status !== 'active') return;
      status = 'finished';
      result = determineResult();
    },

    reset() {
      myReps = 0;
      opponentReps = 0;
      myCombo = 0;
      myMaxCombo = 0;
      opponentCombo = 0;
      timeElapsedSecs = 0;
      result = 'pending';
      lastRepTime = 0;
      status = 'room_ready';
    },

    getState(): DuelState {
      return {
        status,
        myReps,
        opponentReps,
        myCombo,
        myMaxCombo,
        opponentCombo,
        timeElapsedSecs,
        timeLimitSecs: timeLimitSecsVal,
        exerciseId,
        result,
        xpEarned: calcXP(),
        isNewRecord: false,
      };
    },
  };
}

export function getComboTier(combo: number): string {
  if (combo >= 15) return 'LEGENDARY';
  if (combo >= 10) return 'UNSTOPPABLE';
  if (combo >= 5) return 'ON FIRE';
  if (combo >= 3) return 'COMBO';
  return '';
}
