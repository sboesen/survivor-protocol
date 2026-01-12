import { describe, it, expect } from 'vitest';
import { isRelicClassCompatible } from '../loadout';
import type { Item } from '../types';

const createRelic = (overrides: Partial<Item> = {}): Item => ({
  id: 'relic-1',
  name: 'Storm Quiver',
  baseId: 'storm_quiver',
  baseName: 'Storm Quiver',
  tier: 5,
  type: 'relic',
  rarity: 'legendary',
  affixes: [],
  implicits: [],
  relicId: 'storm_quiver',
  relicClassId: 'ranger',
  relicEffectId: 'ranger_storm_quiver',
  relicEffectName: 'Storm Quiver',
  relicEffectDescription: ['Bow fires +2 projectiles.'],
  ...overrides,
});

describe('isRelicClassCompatible', () => {
  it('allows non-relic items', () => {
    const item: Item = {
      id: 'weapon-1',
      name: 'Test Weapon',
      baseId: 'test',
      baseName: 'Test',
      tier: 1,
      type: 'weapon',
      rarity: 'common',
      affixes: [],
      implicits: [],
    };
    expect(isRelicClassCompatible(item, 'ranger')).toBe(true);
  });

  it('allows relics for matching class', () => {
    const item = createRelic();
    expect(isRelicClassCompatible(item, 'ranger')).toBe(true);
  });

  it('blocks relics for other classes', () => {
    const item = createRelic({ relicClassId: 'ranger' });
    expect(isRelicClassCompatible(item, 'wizard')).toBe(false);
  });

  it('blocks relics missing class metadata', () => {
    const item = createRelic({ relicClassId: undefined });
    expect(isRelicClassCompatible(item, 'ranger')).toBe(false);
  });
});
