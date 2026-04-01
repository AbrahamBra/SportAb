import type { Boss } from './bosses';

export function computeLevel(xp: number): number {
  if (xp < 100) return 1;
  return Math.max(1, Math.floor(Math.pow(xp / 100, 2 / 3)));
}

export function xpForNextLevel(currentLevel: number): number {
  return Math.ceil(100 * Math.pow(currentLevel + 1, 1.5));
}

export function canFightBoss(playerLevel: number, boss: Boss): boolean {
  return playerLevel >= boss.requiredLevel;
}
