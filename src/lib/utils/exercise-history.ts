import type { SetLog } from '$lib/game/session-engine';
import { getSessionHistory, type SessionCompletion } from './session-storage';

/**
 * Get all set logs for a specific exercise across all session history.
 * Most recent first.
 */
export function getExerciseHistory(exerciseId: string, limit = 50): SetLog[] {
  const history = getSessionHistory();
  const logs: SetLog[] = [];
  for (const session of history) {
    for (const log of session.logs) {
      if (log.exerciseId === exerciseId) logs.push(log);
    }
    if (logs.length >= limit) break;
  }
  return logs.slice(0, limit);
}

/**
 * Get the last weight used for an exercise (most recent non-null weight).
 */
export function getLastWeight(exerciseId: string): number | null {
  const logs = getExerciseHistory(exerciseId, 20);
  for (const log of logs) {
    if (log.weightKg !== null && log.weightKg > 0) return log.weightKg;
  }
  return null;
}

/**
 * Get the reps from the most recent session for an exercise.
 * Returns the set-by-set reps array and average.
 */
export function getLastSessionReps(exerciseId: string): { sets: number[]; avgReps: number } | null {
  const history = getSessionHistory();
  for (const session of history) {
    const exLogs = session.logs.filter(l => l.exerciseId === exerciseId);
    if (exLogs.length > 0) {
      const sets = exLogs.map(l => l.repsCompleted);
      return { sets, avgReps: sets.reduce((a, b) => a + b, 0) / sets.length };
    }
  }
  return null;
}

/**
 * Count consecutive sessions where the user failed to hit min reps
 * for a given exercise. Used for deload detection.
 */
export function countConsecutiveFailures(exerciseId: string, minReps: number): number {
  const history = getSessionHistory();
  let failures = 0;
  for (const session of history) {
    const exLogs = session.logs.filter(l => l.exerciseId === exerciseId);
    if (exLogs.length === 0) continue;
    const allHitMin = exLogs.every(l => l.repsCompleted >= minReps);
    if (!allHitMin) failures++;
    else break; // stop on first success
  }
  return failures;
}
