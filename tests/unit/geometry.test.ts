import { describe, it, expect } from 'vitest';
import { angleBetween, distance } from '../../src/lib/ai/geometry';

describe('angleBetween', () => {
  it('returns 180 for collinear points', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(180, 0);
  });
  it('returns 90 for perpendicular points', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(90, 0);
  });
  it('returns 180 when magnitude is near zero', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(180);
  });
});

describe('distance', () => {
  it('calculates euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 5);
  });
});
