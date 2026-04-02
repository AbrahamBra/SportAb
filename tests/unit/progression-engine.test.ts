import { describe, it, expect } from 'vitest';
import { computeNextTargets, parseReps, getEncouragement } from '../../src/lib/game/progression-engine';
import type { SessionExercise } from '../../src/lib/data/types';
import type { SessionCompletion } from '../../src/lib/utils/session-storage';

function makeExercise(overrides: Partial<SessionExercise> = {}): SessionExercise {
  return {
    exerciseId: 'Barbell_Bench_Press_-_Medium_Grip',
    exerciseOrder: 1,
    sets: 4,
    reps: '8-10',
    restSecs: 120,
    rpe: 7,
    tempo: null,
    notes: null,
    progressionRule: 'add_weight_when_top_reps',
    ...overrides,
  };
}

function makeHistory(exerciseId: string, setsData: { reps: number; weight: number | null }[]): SessionCompletion[] {
  return [{
    programId: 'test',
    phaseIdx: 0,
    sessionIdx: 0,
    date: new Date().toISOString(),
    totalReps: setsData.reduce((s, d) => s + d.reps, 0),
    durationSecs: 300,
    logs: setsData.map((d, i) => ({
      exerciseId,
      exerciseOrder: 1,
      setNumber: i + 1,
      repsCompleted: d.reps,
      weightKg: d.weight,
      formScore: null,
      rpe: null,
    })),
  }];
}

describe('parseReps', () => {
  it('parses range "8-10"', () => {
    expect(parseReps('8-10')).toEqual({ min: 8, max: 10 });
  });
  it('parses single "5"', () => {
    expect(parseReps('5')).toEqual({ min: 5, max: 5 });
  });
  it('parses "AMRAP"', () => {
    expect(parseReps('AMRAP')).toEqual({ min: 0, max: Infinity });
  });
  it('parses "12-15"', () => {
    expect(parseReps('12-15')).toEqual({ min: 12, max: 15 });
  });
});

describe('computeNextTargets — add_weight_when_top_reps', () => {
  it('suggests weight increase when all sets hit max reps', () => {
    const ex = makeExercise({ reps: '8-10', progressionRule: 'add_weight_when_top_reps' });
    const history = makeHistory(ex.exerciseId, [
      { reps: 10, weight: 40 }, { reps: 10, weight: 40 },
      { reps: 10, weight: 40 }, { reps: 10, weight: 40 },
    ]);
    const result = computeNextTargets(ex, history);
    expect(result.suggestedWeightKg).toBe(42.5);
    expect(result.isProgression).toBe(true);
    expect(result.progressionNote).toContain('42.5');
  });

  it('keeps same weight when not all sets hit max', () => {
    const ex = makeExercise({ reps: '8-10', progressionRule: 'add_weight_when_top_reps' });
    const history = makeHistory(ex.exerciseId, [
      { reps: 10, weight: 40 }, { reps: 9, weight: 40 },
      { reps: 8, weight: 40 }, { reps: 8, weight: 40 },
    ]);
    const result = computeNextTargets(ex, history);
    expect(result.suggestedWeightKg).toBe(40);
    expect(result.isProgression).toBe(false);
  });

  it('uses +5kg for squat', () => {
    const ex = makeExercise({
      exerciseId: 'Barbell_Squat', reps: '6-8', progressionRule: 'add_weight_when_top_reps',
    });
    const history = makeHistory('Barbell_Squat', [
      { reps: 8, weight: 60 }, { reps: 8, weight: 60 },
      { reps: 8, weight: 60 }, { reps: 8, weight: 60 },
    ]);
    const result = computeNextTargets(ex, history);
    expect(result.suggestedWeightKg).toBe(65);
  });
});

describe('computeNextTargets — add_weight_every_session', () => {
  it('always increases weight', () => {
    const ex = makeExercise({
      exerciseId: 'Barbell_Squat', reps: '5', progressionRule: 'add_weight_every_session',
    });
    const history = makeHistory('Barbell_Squat', [
      { reps: 5, weight: 60 }, { reps: 5, weight: 60 },
    ]);
    const result = computeNextTargets(ex, history);
    expect(result.suggestedWeightKg).toBe(65); // +5 for squat
    expect(result.isProgression).toBe(true);
  });
});

describe('computeNextTargets — add_reps', () => {
  it('adds 1 rep when all sets hit target', () => {
    const ex = makeExercise({
      reps: '12-15', progressionRule: 'add_reps',
    });
    const history = makeHistory(ex.exerciseId, [
      { reps: 15, weight: 10 }, { reps: 15, weight: 10 }, { reps: 15, weight: 10 },
    ]);
    const result = computeNextTargets(ex, history);
    expect(result.suggestedReps).toBe('12-16');
    expect(result.isProgression).toBe(true);
  });

  it('keeps same reps when not all sets hit target', () => {
    const ex = makeExercise({
      reps: '12-15', progressionRule: 'add_reps',
    });
    const history = makeHistory(ex.exerciseId, [
      { reps: 14, weight: 10 }, { reps: 13, weight: 10 }, { reps: 12, weight: 10 },
    ]);
    const result = computeNextTargets(ex, history);
    expect(result.suggestedReps).toBe('12-15');
    expect(result.isProgression).toBe(false);
  });
});

describe('computeNextTargets — deload', () => {
  it('suggests deload after 2 consecutive failures', () => {
    const ex = makeExercise({ reps: '8-10', progressionRule: 'add_weight_when_top_reps' });
    // Two sessions where user failed to hit 8 reps
    const history: SessionCompletion[] = [
      ...makeHistory(ex.exerciseId, [{ reps: 6, weight: 50 }, { reps: 5, weight: 50 }]),
      ...makeHistory(ex.exerciseId, [{ reps: 7, weight: 50 }, { reps: 6, weight: 50 }]),
    ];
    const result = computeNextTargets(ex, history);
    expect(result.suggestedWeightKg).toBe(45); // 50 * 0.9 = 45
    expect(result.progressionNote).toContain('Deload');
  });
});

describe('computeNextTargets — null rule', () => {
  it('returns last weight with no progression', () => {
    const ex = makeExercise({ progressionRule: null });
    const history = makeHistory(ex.exerciseId, [{ reps: 5, weight: 60 }]);
    const result = computeNextTargets(ex, history);
    expect(result.suggestedWeightKg).toBe(60);
    expect(result.isProgression).toBe(false);
    expect(result.progressionNote).toBeNull();
  });
});

describe('computeNextTargets — no history', () => {
  it('returns null weight for first session', () => {
    const ex = makeExercise();
    const result = computeNextTargets(ex, []);
    expect(result.suggestedWeightKg).toBeNull();
    expect(result.progressionNote).toContain('Premiere');
  });
});

describe('getEncouragement', () => {
  it('celebrates weight record', () => {
    expect(getEncouragement(10, '8-10', 45, 42.5)).toContain('RECORD');
  });
  it('celebrates hitting top of range', () => {
    expect(getEncouragement(10, '8-10', 40, 40)).toContain('monte');
  });
  it('encourages when hitting minimum', () => {
    expect(getEncouragement(8, '8-10', 40, 40)).toContain('Bien');
  });
  it('reassures below minimum', () => {
    expect(getEncouragement(6, '8-10', 40, 40)).toContain('ton rythme');
  });
});
