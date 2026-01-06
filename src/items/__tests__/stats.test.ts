import { describe, it, expect } from 'vitest';
import { ItemStats } from '../stats';
import type { Item } from '../types';
import type { LoadoutData } from '../../types';

const createItem = (type: Item['type'], affixes: Item['affixes']): Item => ({
  id: `item-${type}`,
  name: 'Test Item',
  type,
  rarity: 'common',
  affixes,
});

describe('ItemStats.calculate', () => {
  it('aggregates affixes and converts percentage stats', () => {
    const weapon = createItem('weapon', [
      { type: 'flatDamage', tier: 1, value: 5 },
      { type: 'percentDamage', tier: 1, value: 20, isPercent: true },
      { type: 'cooldownReduction', tier: 1, value: 10, isPercent: true },
      { type: 'projectiles', tier: 1, value: 1 },
    ]);

    const accessory = createItem('accessory', [
      { type: 'luck', tier: 1, value: 15, isPercent: true },
      { type: 'pickupRadius', tier: 1, value: 10 },
      { type: 'allStats', tier: 1, value: 5, isPercent: true },
    ]);

    const loadout: LoadoutData = {
      relic: null,
      weapon,
      helm: null,
      armor: null,
      accessory1: accessory,
      accessory2: null,
      accessory3: null,
    };

    const stats = ItemStats.calculate(loadout);

    expect(stats.flatDamage).toBe(5);
    expect(stats.percentDamage).toBeCloseTo(0.2, 4);
    expect(stats.cooldownReduction).toBeCloseTo(0.1, 4);
    expect(stats.projectiles).toBe(1);
    expect(stats.luck).toBe(15);
    expect(stats.pickupRadius).toBe(10);
    expect(stats.allStats).toBeCloseTo(0.05, 4);
  });
});
