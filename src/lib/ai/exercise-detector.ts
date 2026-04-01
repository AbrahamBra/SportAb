import { angleBetween } from './geometry';
import type { ExerciseConfig } from './exercises.config';

export interface Keypoint {
  name: string;
  x: number;
  y: number;
  score: number;
}

export interface ExerciseDetector {
  processFrame(keypoints: Keypoint[]): void;
  getReps(): number;
  getState(): 'up' | 'down';
  getFormScore(): number;
  getSignalValue(): number;
  reset(): void;
}

export function createExerciseDetector(config: ExerciseConfig): ExerciseDetector {
  let state: 'up' | 'down' = 'up';
  let reps = 0;
  let lastSignal = 0;
  let formScoreSum = 0;

  function getKp(keypoints: Keypoint[], name: string): Keypoint | undefined {
    return keypoints.find(k => k.name === name && k.score >= config.minConfidence);
  }

  function computeElbowAngle(kps: Keypoint[]): number | null {
    const ls = getKp(kps, 'left_shoulder'), le = getKp(kps, 'left_elbow'), lw = getKp(kps, 'left_wrist');
    const rs = getKp(kps, 'right_shoulder'), re = getKp(kps, 'right_elbow'), rw = getKp(kps, 'right_wrist');
    const angles: number[] = [];
    if (ls && le && lw) angles.push(angleBetween(ls, le, lw));
    if (rs && re && rw) angles.push(angleBetween(rs, re, rw));
    return angles.length ? angles.reduce((a, b) => a + b, 0) / angles.length : null;
  }

  function computeHipRatio(kps: Keypoint[]): number | null {
    const lh = getKp(kps, 'left_hip'), la = getKp(kps, 'left_ankle');
    const rh = getKp(kps, 'right_hip'), ra = getKp(kps, 'right_ankle');
    const ratios: number[] = [];
    if (lh && la && la.y > 0) ratios.push(lh.y / la.y);
    if (rh && ra && ra.y > 0) ratios.push(rh.y / ra.y);
    if (!ratios.length) return null;
    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return 180 - (avg - 0.5) * 240;
  }

  function computeSignal(kps: Keypoint[]): number | null {
    return config.signalType === 'elbow-angle' ? computeElbowAngle(kps) : computeHipRatio(kps);
  }

  return {
    processFrame(keypoints: Keypoint[]) {
      const signal = computeSignal(keypoints);
      if (signal === null) return;
      lastSignal = signal;
      if (state === 'up' && signal < config.downThreshold) {
        state = 'down';
      } else if (state === 'down' && signal > config.upThreshold) {
        state = 'up';
        reps++;
        formScoreSum += Math.min(1, Math.max(0, (config.upThreshold - signal) / (config.upThreshold - config.downThreshold) + 0.5));
      }
    },
    getReps: () => reps,
    getState: () => state,
    getFormScore: () => reps > 0 ? formScoreSum / reps : 0,
    getSignalValue: () => lastSignal,
    reset() { state = 'up'; reps = 0; lastSignal = 0; formScoreSum = 0; },
  };
}
