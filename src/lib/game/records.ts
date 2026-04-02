interface Records {
  [bossId: string]: {
    bestReps: number;
    bestTimeSecs: number; // fastest time to victory (lower = better)
    date: string;
  };
}

const STORAGE_KEY = 'pushquest_records';

export function getRecords(): Records {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Records;
  } catch {}
  return {};
}

/**
 * Check if this battle result is a new personal record.
 * Returns 'reps' | 'time' | 'both' | null
 */
export function checkAndUpdatePR(
  bossId: string,
  reps: number,
  timeSecs: number,
  isVictory: boolean
): 'reps' | 'time' | 'both' | null {
  const records = getRecords();
  const current = records[bossId];
  let newRecord: 'reps' | 'time' | 'both' | null = null;

  if (!current) {
    records[bossId] = { bestReps: reps, bestTimeSecs: isVictory ? timeSecs : Infinity, date: new Date().toISOString() };
    newRecord = 'both';
  } else {
    let isNewReps = false;
    let isNewTime = false;

    if (reps > current.bestReps) {
      current.bestReps = reps;
      isNewReps = true;
    }
    if (isVictory && timeSecs < current.bestTimeSecs) {
      current.bestTimeSecs = timeSecs;
      isNewTime = true;
    }

    if (isNewReps && isNewTime) newRecord = 'both';
    else if (isNewReps) newRecord = 'reps';
    else if (isNewTime) newRecord = 'time';

    if (newRecord) current.date = new Date().toISOString();
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return newRecord;
}

export function getPR(bossId: string): { bestReps: number; bestTimeSecs: number } | null {
  const records = getRecords();
  return records[bossId] ?? null;
}
