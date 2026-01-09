import { describe, it, expect } from 'vitest';
import { calculateDropChance, rollItemType, shouldDropItem } from '../drops';

describe('drops', () => {
  it('should scale drop chance with time and luck', () => {
    const base = calculateDropChance('basic', 0, 0);
    const scaled = calculateDropChance('basic', 100, 10);
    expect(base).toBeCloseTo(0.05, 5);
    expect(scaled).toBeGreaterThan(base);
  });

  it('should cap drop chance at 1', () => {
    const chance = calculateDropChance('elite', 100, 30);
    expect(chance).toBe(1);
  });

  it('should respect random roll for drop decision', () => {
    const alwaysDrop = shouldDropItem('basic', 0, 0, () => 0);
    const neverDrop = shouldDropItem('basic', 0, 0, () => 1);
    expect(alwaysDrop).toBe(true);
    expect(neverDrop).toBe(false);
  });

  it('should roll a valid item type', () => {
    const types = new Set(['weapon', 'helm', 'armor', 'accessory', 'offhand']);
    const rolled = rollItemType(() => 0.1);
    expect(types.has(rolled)).toBe(true);
  });
});
