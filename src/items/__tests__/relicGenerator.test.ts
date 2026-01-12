import { describe, it, expect } from 'vitest';
import { ItemGenerator } from '../generator';

describe('ItemGenerator.generateRelic', () => {
  it('creates a ranger relic with metadata', () => {
    const item = ItemGenerator.generate({ itemType: 'relic', luck: 0, classId: 'ranger', random: () => 0.1 });

    expect(item.type).toBe('relic');
    expect(item.rarity).toBe('legendary');
    expect(item.relicId).toBe('storm_quiver');
    expect(item.relicClassId).toBe('ranger');
    expect(item.relicEffectDescription?.length).toBeGreaterThan(0);
    expect(item.affixes.length).toBeGreaterThan(0);
  });

  it('throws when classId is missing', () => {
    expect(() => ItemGenerator.generate({ itemType: 'relic', luck: 0 })).toThrow();
  });
});
