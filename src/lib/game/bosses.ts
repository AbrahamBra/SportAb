export interface Boss {
  id: string;
  name: string;
  hp: number;
  timeLimitSecs: number;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'boss';
  requiredLevel: number;
  isFree: boolean;
}

export const BOSSES: Boss[] = [
  { id: 'goblin', name: 'DRAKE', hp: 20, timeLimitSecs: 180, xpReward: 100, difficulty: 'easy', requiredLevel: 1, isFree: true },
  { id: 'orc',    name: 'LIZARD',    hp: 35, timeLimitSecs: 240, xpReward: 200, difficulty: 'medium', requiredLevel: 3, isFree: true },
  { id: 'jinn',   name: 'DJINN',  hp: 45, timeLimitSecs: 240, xpReward: 300, difficulty: 'medium', requiredLevel: 4, isFree: true },
  { id: 'troll',  name: 'DEMON',  hp: 50, timeLimitSecs: 300, xpReward: 350, difficulty: 'hard', requiredLevel: 5, isFree: false },
  { id: 'medusa', name: 'MEDUSA', hp: 65, timeLimitSecs: 360, xpReward: 450, difficulty: 'hard', requiredLevel: 6, isFree: false },
  { id: 'titan',  name: 'DRAGON',  hp: 80, timeLimitSecs: 420, xpReward: 600, difficulty: 'boss', requiredLevel: 8, isFree: false },
  { id: 'demon_slime', name: 'DEMON SLIME', hp: 100, timeLimitSecs: 480, xpReward: 800, difficulty: 'boss', requiredLevel: 10, isFree: false },
];

export function getBoss(id: string): Boss | undefined {
  return BOSSES.find(b => b.id === id);
}
