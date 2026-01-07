import { describe, it, expect } from 'vitest';
import { getBaseTierRange, rollBaseTier } from '../bases';

describe('bases', () => {
  it('returns expected tier ranges by time', () => {
    expect(getBaseTierRange(0)).toEqual({ min: 1, max: 1 });
    expect(getBaseTierRange(4)).toEqual({ min: 1, max: 2 });
    expect(getBaseTierRange(7)).toEqual({ min: 2, max: 3 });
    expect(getBaseTierRange(12)).toEqual({ min: 3, max: 4 });
    expect(getBaseTierRange(20)).toEqual({ min: 4, max: 5 });
  });

  it('bumps base tier for elites and bosses', () => {
    const roll = () => 0;
    expect(rollBaseTier(0, 'elite', roll)).toBe(2);
    expect(rollBaseTier(0, 'boss', roll)).toBe(2);
  });
});
