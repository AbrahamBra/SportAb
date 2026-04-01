import { describe, it, expect } from 'vitest';
import { createExerciseDetector } from '../../src/lib/ai/exercise-detector';
import { EXERCISES } from '../../src/lib/ai/exercises.config';

function makeKeypoints(overrides: Record<string, { x: number; y: number; score: number }>) {
  const names = ['nose','left_eye','right_eye','left_ear','right_ear',
    'left_shoulder','right_shoulder','left_elbow','right_elbow',
    'left_wrist','right_wrist','left_hip','right_hip',
    'left_knee','right_knee','left_ankle','right_ankle'];
  return names.map(name => ({
    name,
    x: 100, y: 100, score: 0.1,
    ...(overrides[name] || {}),
  }));
}

function pushupDown() {
  // Elbow angle ~63deg (well below 90 threshold)
  return makeKeypoints({
    left_shoulder: { x: 100, y: 50, score: 0.9 },
    left_elbow:    { x: 100, y: 100, score: 0.9 },
    left_wrist:    { x: 60, y: 80, score: 0.9 },
    right_shoulder:{ x: 200, y: 50, score: 0.9 },
    right_elbow:   { x: 200, y: 100, score: 0.9 },
    right_wrist:   { x: 240, y: 80, score: 0.9 },
  });
}

function pushupUp() {
  return makeKeypoints({
    left_shoulder: { x: 100, y: 100, score: 0.9 },
    left_elbow:    { x: 120, y: 100, score: 0.9 },
    left_wrist:    { x: 140, y: 100, score: 0.9 },
    right_shoulder:{ x: 200, y: 100, score: 0.9 },
    right_elbow:   { x: 180, y: 100, score: 0.9 },
    right_wrist:   { x: 160, y: 100, score: 0.9 },
  });
}

describe('ExerciseDetector - push-up', () => {
  it('starts at 0 reps, up state', () => {
    const det = createExerciseDetector(EXERCISES.pushup);
    expect(det.getReps()).toBe(0);
    expect(det.getState()).toBe('up');
  });
  it('counts a rep on down-then-up', () => {
    const det = createExerciseDetector(EXERCISES.pushup);
    det.processFrame(pushupDown());
    expect(det.getState()).toBe('down');
    det.processFrame(pushupUp());
    expect(det.getState()).toBe('up');
    expect(det.getReps()).toBe(1);
  });
  it('does not count half reps', () => {
    const det = createExerciseDetector(EXERCISES.pushup);
    det.processFrame(pushupDown());
    det.processFrame(pushupDown());
    expect(det.getReps()).toBe(0);
  });
  it('resets correctly', () => {
    const det = createExerciseDetector(EXERCISES.pushup);
    det.processFrame(pushupDown());
    det.processFrame(pushupUp());
    det.reset();
    expect(det.getReps()).toBe(0);
    expect(det.getState()).toBe('up');
  });
});
