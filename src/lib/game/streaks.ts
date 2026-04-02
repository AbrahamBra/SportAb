interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'pushquest_streaks';

function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0]!;
}

export function getStreaks(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StreakData;
  } catch {}
  return { currentStreak: 0, bestStreak: 0, lastActiveDate: '' };
}

/** Call after each battle completion. Returns updated streaks. */
export function updateStreak(): StreakData {
  const s = getStreaks();
  const t = today();

  if (s.lastActiveDate === t) return s; // Already updated today

  if (s.lastActiveDate === yesterday()) {
    s.currentStreak++;
  } else if (s.lastActiveDate !== t) {
    s.currentStreak = 1; // Reset streak
  }

  s.bestStreak = Math.max(s.bestStreak, s.currentStreak);
  s.lastActiveDate = t;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

/** Deterministic daily challenge based on date. */
export function getDailyChallenge(): { bossId: string; exerciseId: string } {
  const dateStr = today();
  // Simple hash of date string
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  const bossIds = ['goblin', 'orc', 'jinn', 'troll', 'medusa', 'titan'];
  const exerciseIds = ['pushup', 'squat', 'lunge', 'dips', 'glute-bridge', 'pullup'];

  return {
    bossId: bossIds[hash % bossIds.length]!,
    exerciseId: exerciseIds[(hash >> 8) % exerciseIds.length]!,
  };
}
