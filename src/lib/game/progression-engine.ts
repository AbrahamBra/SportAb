import type { SessionExercise } from '$lib/data/types';
import type { SessionCompletion } from '$lib/utils/session-storage';
import type { SetLog } from './session-engine';

export interface ExerciseTarget {
  exerciseId: string;
  suggestedWeightKg: number | null;
  suggestedReps: string;
  progressionNote: string | null;
  isProgression: boolean;
}

// Exercises that use +5kg increments (lower body compounds)
const HEAVY_INCREMENT_EXERCISES = [
  'Barbell_Squat', 'Barbell_Full_Squat', 'Barbell_Deadlift',
  'Sumo_Deadlift', 'Hack_Squat', 'Leg_Press',
  'Stiff-Legged_Barbell_Deadlift', 'Romanian_Deadlift',
  'Barbell_Hip_Thrust',
];

/**
 * Parse a rep range string into min/max values.
 * "8-10" → { min: 8, max: 10 }
 * "5" → { min: 5, max: 5 }
 * "AMRAP" → { min: 0, max: Infinity }
 * "30s" → { min: 30, max: 30 } (time-based, treat as fixed)
 */
export function parseReps(reps: string): { min: number; max: number } {
  if (reps === 'AMRAP') return { min: 0, max: Infinity };
  if (reps.includes('-')) {
    const [a, b] = reps.split('-').map(Number);
    return { min: a ?? 0, max: b ?? a ?? 0 };
  }
  const n = parseInt(reps, 10);
  return { min: isNaN(n) ? 0 : n, max: isNaN(n) ? 0 : n };
}

/**
 * Get the weight increment for an exercise.
 * Lower body compounds: +5kg
 * Everything else: +2.5kg
 */
function getWeightIncrement(exerciseId: string): number {
  return HEAVY_INCREMENT_EXERCISES.includes(exerciseId) ? 5 : 2.5;
}

/**
 * Find the most recent session logs for a specific exercise.
 */
function findLastLogs(exerciseId: string, history: SessionCompletion[]): SetLog[] {
  for (const session of history) {
    const logs = session.logs.filter(l => l.exerciseId === exerciseId);
    if (logs.length > 0) return logs;
  }
  return [];
}

/**
 * Count how many consecutive sessions the user failed to hit min reps.
 */
function countFailures(exerciseId: string, minReps: number, history: SessionCompletion[]): number {
  let failures = 0;
  for (const session of history) {
    const logs = session.logs.filter(l => l.exerciseId === exerciseId);
    if (logs.length === 0) continue;
    if (logs.every(l => l.repsCompleted >= minReps)) break;
    failures++;
  }
  return failures;
}

/**
 * Core progression engine: compute the next session's targets for an exercise.
 */
export function computeNextTargets(
  exercise: SessionExercise,
  history: SessionCompletion[],
): ExerciseTarget {
  const { exerciseId, reps, progressionRule } = exercise;
  const { min: minReps, max: maxReps } = parseReps(reps);
  const lastLogs = findLastLogs(exerciseId, history);
  const lastWeight = lastLogs.find(l => l.weightKg !== null && l.weightKg > 0)?.weightKg ?? null;
  const increment = getWeightIncrement(exerciseId);

  // No rule = no progression (cutting programs)
  if (!progressionRule) {
    return {
      exerciseId,
      suggestedWeightKg: lastWeight,
      suggestedReps: reps,
      progressionNote: null,
      isProgression: false,
    };
  }

  // No history = first time, use starting weight or null
  if (lastLogs.length === 0) {
    return {
      exerciseId,
      suggestedWeightKg: null, // will be filled by starting-weights system
      suggestedReps: reps,
      progressionNote: 'Premiere seance — ajuste le poids',
      isProgression: false,
    };
  }

  // Check for deload: 2+ consecutive failures to hit min reps
  const failures = countFailures(exerciseId, minReps, history);
  if (failures >= 2 && lastWeight) {
    const deloadWeight = Math.round((lastWeight * 0.9) / 2.5) * 2.5; // round to 2.5
    return {
      exerciseId,
      suggestedWeightKg: deloadWeight,
      suggestedReps: reps,
      progressionNote: `Deload : ${deloadWeight}kg (-10%). Tu reviendras plus fort !`,
      isProgression: false,
    };
  }

  // Apply progression rule
  switch (progressionRule) {
    case 'add_weight_when_top_reps': {
      const allHitMax = lastLogs.every(l => l.repsCompleted >= maxReps);
      if (allHitMax && lastWeight) {
        const newWeight = lastWeight + increment;
        return {
          exerciseId,
          suggestedWeightKg: newWeight,
          suggestedReps: reps,
          progressionNote: `Augmente a ${newWeight}kg ! (+${increment})`,
          isProgression: true,
        };
      }
      // Didn't hit max reps — stay at same weight
      return {
        exerciseId,
        suggestedWeightKg: lastWeight,
        suggestedReps: reps,
        progressionNote: lastWeight ? `${lastWeight}kg — vise ${maxReps} reps sur chaque serie` : null,
        isProgression: false,
      };
    }

    case 'add_weight_every_session': {
      if (lastWeight) {
        const newWeight = lastWeight + increment;
        return {
          exerciseId,
          suggestedWeightKg: newWeight,
          suggestedReps: reps,
          progressionNote: `${newWeight}kg (+${increment} par seance)`,
          isProgression: true,
        };
      }
      return {
        exerciseId,
        suggestedWeightKg: null,
        suggestedReps: reps,
        progressionNote: null,
        isProgression: false,
      };
    }

    case 'add_reps': {
      const allHitTarget = lastLogs.every(l => l.repsCompleted >= maxReps);
      if (allHitTarget && maxReps !== Infinity) {
        // Check if we've exceeded cap (max + 2)
        const avgLastReps = lastLogs.reduce((s, l) => s + l.repsCompleted, 0) / lastLogs.length;
        if (avgLastReps >= maxReps + 2 && lastWeight) {
          // Suggest weight increase instead of more reps
          const newWeight = lastWeight + increment;
          return {
            exerciseId,
            suggestedWeightKg: newWeight,
            suggestedReps: reps, // reset reps to original range
            progressionNote: `Monte a ${newWeight}kg et reviens a ${minReps} reps`,
            isProgression: true,
          };
        }
        // Add 1 rep
        const newMax = maxReps + 1;
        const newReps = minReps === maxReps ? `${newMax}` : `${minReps}-${newMax}`;
        return {
          exerciseId,
          suggestedWeightKg: lastWeight,
          suggestedReps: newReps,
          progressionNote: `+1 rep ! Vise ${newMax} reps`,
          isProgression: true,
        };
      }
      return {
        exerciseId,
        suggestedWeightKg: lastWeight,
        suggestedReps: reps,
        progressionNote: lastWeight ? `${lastWeight}kg — vise ${maxReps} reps` : `Vise ${maxReps} reps`,
        isProgression: false,
      };
    }

    default:
      return {
        exerciseId,
        suggestedWeightKg: lastWeight,
        suggestedReps: reps,
        progressionNote: null,
        isProgression: false,
      };
  }
}

/**
 * Generate an encouragement message based on set performance.
 */
export function getEncouragement(
  repsCompleted: number,
  targetReps: string,
  weightKg: number | null,
  lastWeight: number | null,
): string | null {
  const { min, max } = parseReps(targetReps);

  // New weight record
  if (weightKg && lastWeight && weightKg > lastWeight) {
    return 'NOUVEAU RECORD de charge ! ⚡';
  }

  // Hit top of range on all reps
  if (repsCompleted >= max && max !== Infinity) {
    return 'Parfait ! Prochaine fois, on monte 🔥';
  }

  // Hit minimum
  if (repsCompleted >= min) {
    return 'Bien joue ! Continue 💪';
  }

  // Below minimum
  if (repsCompleted > 0 && repsCompleted < min) {
    return 'C\'est normal, progresse a ton rythme 🛡️';
  }

  return null;
}
