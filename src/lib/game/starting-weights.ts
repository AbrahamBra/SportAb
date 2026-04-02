export type ExperienceLevel = 'never' | 'sometimes' | 'regular' | 'advanced';

export interface StartingWeights {
  [exerciseId: string]: number; // kg
}

/**
 * Default starting weights by experience level.
 * Based on common gym standards for untrained to intermediate lifters.
 * Bodyweight exercises get null (no weight needed).
 */
const WEIGHT_TABLE: Record<string, Record<ExperienceLevel, number>> = {
  // Barbell compounds — lower body
  'Barbell_Squat':                     { never: 20, sometimes: 40, regular: 60, advanced: 80 },
  'Barbell_Full_Squat':                { never: 20, sometimes: 40, regular: 60, advanced: 80 },
  'Hack_Squat':                        { never: 30, sometimes: 50, regular: 70, advanced: 100 },
  'Barbell_Deadlift':                  { never: 30, sometimes: 50, regular: 80, advanced: 100 },
  'Sumo_Deadlift':                     { never: 30, sometimes: 50, regular: 80, advanced: 100 },
  'Romanian_Deadlift':                 { never: 20, sometimes: 40, regular: 60, advanced: 80 },
  'Stiff-Legged_Barbell_Deadlift':     { never: 20, sometimes: 40, regular: 60, advanced: 80 },
  'Barbell_Hip_Thrust':                { never: 20, sometimes: 40, regular: 60, advanced: 80 },
  'Barbell_Lunge':                     { never: 20, sometimes: 30, regular: 40, advanced: 60 },
  'Leg_Press':                         { never: 40, sometimes: 80, regular: 120, advanced: 180 },

  // Barbell compounds — upper body
  'Barbell_Bench_Press_-_Medium_Grip':          { never: 20, sometimes: 30, regular: 50, advanced: 70 },
  'Barbell_Incline_Bench_Press_-_Medium_Grip':  { never: 20, sometimes: 25, regular: 40, advanced: 60 },
  'Barbell_Shoulder_Press':                     { never: 15, sometimes: 20, regular: 35, advanced: 45 },
  'Bent_Over_Barbell_Row':                      { never: 20, sometimes: 30, regular: 45, advanced: 60 },
  'Barbell_Curl':                               { never: 10, sometimes: 15, regular: 25, advanced: 35 },
  'Lying_Triceps_Press':                        { never: 10, sometimes: 15, regular: 25, advanced: 35 },

  // Dumbbell exercises (per hand)
  'Dumbbell_Shoulder_Press':      { never: 4, sometimes: 8, regular: 14, advanced: 20 },
  'Dumbbell_Bench_Press':         { never: 6, sometimes: 10, regular: 16, advanced: 22 },
  'Incline_Dumbbell_Press':       { never: 6, sometimes: 10, regular: 14, advanced: 20 },
  'Dumbbell_Flyes':               { never: 4, sometimes: 8, regular: 12, advanced: 16 },
  'Dumbbell_Bicep_Curl':          { never: 4, sometimes: 6, regular: 10, advanced: 14 },
  'Hammer_Curls':                 { never: 4, sometimes: 6, regular: 10, advanced: 14 },
  'Incline_Dumbbell_Curl':        { never: 4, sometimes: 6, regular: 8, advanced: 12 },
  'Concentration_Curls':          { never: 4, sometimes: 6, regular: 8, advanced: 12 },
  'Dumbbell_Lunges':              { never: 4, sometimes: 8, regular: 12, advanced: 18 },
  'Dumbbell_Step_Ups':            { never: 4, sometimes: 8, regular: 12, advanced: 16 },
  'Bent_Over_Two-Dumbbell_Row':   { never: 6, sometimes: 10, regular: 14, advanced: 20 },
  'Goblet_Squat':                 { never: 6, sometimes: 10, regular: 16, advanced: 22 },
  'Side_Lateral_Raise':           { never: 2, sometimes: 4, regular: 6, advanced: 10 },
  'Reverse_Flyes':                { never: 2, sometimes: 4, regular: 6, advanced: 8 },
  'Tricep_Dumbbell_Kickback':     { never: 2, sometimes: 4, regular: 6, advanced: 10 },

  // Cable exercises
  'Seated_Cable_Rows':                        { never: 15, sometimes: 25, regular: 40, advanced: 55 },
  'Wide-Grip_Lat_Pulldown':                   { never: 20, sometimes: 30, regular: 45, advanced: 60 },
  'V-Bar_Pulldown':                           { never: 20, sometimes: 30, regular: 45, advanced: 60 },
  'Cable_Crossover':                          { never: 5, sometimes: 10, regular: 15, advanced: 20 },
  'Cable_Rope_Overhead_Triceps_Extension':    { never: 5, sometimes: 10, regular: 15, advanced: 20 },
  'Face_Pull':                                { never: 5, sometimes: 10, regular: 15, advanced: 20 },
  'Straight-Arm_Pulldown':                    { never: 10, sometimes: 15, regular: 25, advanced: 35 },

  // Machine exercises
  'Leg_Extensions':       { never: 15, sometimes: 25, regular: 40, advanced: 60 },
  'Lying_Leg_Curls':      { never: 15, sometimes: 25, regular: 35, advanced: 50 },
  'Standing_Calf_Raises': { never: 20, sometimes: 40, regular: 60, advanced: 80 },
  'Seated_Calf_Raise':    { never: 15, sometimes: 25, regular: 40, advanced: 60 },
  'Preacher_Curl':        { never: 10, sometimes: 15, regular: 25, advanced: 35 },
};

/**
 * Compute starting weights for all exercises based on user experience.
 */
export function computeStartingWeights(experience: ExperienceLevel): StartingWeights {
  const weights: StartingWeights = {};
  for (const [id, table] of Object.entries(WEIGHT_TABLE)) {
    weights[id] = table[experience];
  }
  return weights;
}

/**
 * Get the starting weight for a specific exercise.
 * Returns null for bodyweight exercises or unknown exercises.
 */
export function getStartingWeight(exerciseId: string, experience: ExperienceLevel): number | null {
  return WEIGHT_TABLE[exerciseId]?.[experience] ?? null;
}

// ─── localStorage persistence ─────────────────────────

const STORAGE_KEY = 'pushquest_starting_weights';

export function saveStartingWeights(weights: StartingWeights): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(weights)); } catch {}
}

export function loadStartingWeights(): StartingWeights | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
