import { describe, it, expect } from 'vitest';
import { computeLevel, xpForNextLevel, canFightBoss } from '../../src/lib/game/progression';
import { BOSSES } from '../../src/lib/game/bosses';

describe('computeLevel', () => {
  it('level 1 at 0 XP', () => expect(computeLevel(0)).toBe(1));
  it('level 1 at 99 XP', () => expect(computeLevel(99)).toBe(1));
  it('monotonically increasing', () => {
    let prev = 0;
    for (let xp = 0; xp < 10000; xp += 50) {
      const lvl = computeLevel(xp);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });
});

describe('canFightBoss', () => {
  it('anyone fights goblin', () => expect(canFightBoss(1, BOSSES[0])).toBe(true));
  it('level 2 cannot fight troll', () => expect(canFightBoss(2, BOSSES[2])).toBe(false));
  it('level 5 can fight troll', () => expect(canFightBoss(5, BOSSES[2])).toBe(true));
});

describe('xpForNextLevel', () => {
  it('increases with level', () => {
    expect(xpForNextLevel(2)).toBeGreaterThan(xpForNextLevel(1));
  });
});
