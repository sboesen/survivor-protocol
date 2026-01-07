import { describe, it, expect } from 'vitest';
import { ItemGenerator, _test } from '../generator';
import { AFFIX_POOLS } from '../affixTables';
import type { ItemRarity } from '../types';

const mulberry32 = (seed: number): (() => number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

describe('ItemGenerator', () => {
  it('should increase legendary rate with luck', () => {
    const sample = (luck: number) => {
      const rng = mulberry32(123);
      const counts: Record<ItemRarity, number> = {
        common: 0,
        magic: 0,
        rare: 0,
        legendary: 0,
      };
      for (let i = 0; i < 10000; i++) {
        const rarity = _test.rollRarity(luck, rng);
        counts[rarity]++;
      }
      return counts;
    };

    const base = sample(0);
    const lucky = sample(100);
    expect(lucky.legendary).toBeGreaterThan(base.legendary);
    expect(lucky.rare).toBeGreaterThan(base.rare);
  });

  it('should not duplicate affix types on an item', () => {
    const rng = mulberry32(42);
    const item = ItemGenerator.generate({ itemType: 'weapon', luck: 0, rarityBoost: 3, random: rng });
    const types = item.affixes.map(affix => affix.type);
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });

  it('should prevent tier 1 rolls on legendary items', () => {
    const rng = mulberry32(7);
    const item = ItemGenerator.generate({ itemType: 'armor', luck: 0, rarityBoost: 3, random: rng });
    const tiers = item.affixes.map(affix => affix.tier);
    expect(tiers.every(tier => tier >= 2)).toBe(true);
  });

  it('should apply rarity boost after rolling', () => {
    expect(_test.applyRarityBoost('common', 0)).toBe('common');
    expect(_test.applyRarityBoost('common', 2)).toBe('rare');
    expect(_test.applyRarityBoost('rare', 5)).toBe('legendary');
  });

  it('should cap common tiers to T2', () => {
    const def = AFFIX_POOLS.accessory[0];
    const result = _test.rollAffixTier(def, 'common', () => 0.99);
    expect(result.tier).toBeLessThanOrEqual(2);
  });
});
