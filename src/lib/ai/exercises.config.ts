export interface ExerciseConfig {
  id: string;
  name: string;
  downThreshold: number;
  upThreshold: number;
  minConfidence: number;
  signalType: 'elbow-angle' | 'hip-ratio';
}

export const EXERCISES: Record<string, ExerciseConfig> = {
  pushup: {
    id: 'pushup',
    name: 'Push-ups',
    downThreshold: 90,
    upThreshold: 155,
    minConfidence: 0.4,
    signalType: 'elbow-angle',
  },
  squat: {
    id: 'squat',
    name: 'Squats',
    downThreshold: 100,
    upThreshold: 155,
    minConfidence: 0.35,
    signalType: 'hip-ratio',
  },
};
