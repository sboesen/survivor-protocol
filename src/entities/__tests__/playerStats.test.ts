import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../player';
import type { Item } from '../../items/types';
import { ItemStats } from '../../items/stats';
import { CHARACTERS } from '../../data/characters';

vi.mock('../../systems/renderer', () => ({
  Renderer: {
    drawSprite: vi.fn(),
  },
}));

vi.mock('../../items/stash', () => ({
  Stash: {
    fromJSON: vi.fn(() => ({
      addItem: vi.fn(),
      toJSON: vi.fn(() => []),
    })),
  },
}));

describe('Player Stats - allStats Calculations', () => {
  let player: Player;
  const createAllStatsItem = (value: number): Item => ({
    id: 'test',
    name: 'Test Item',
    baseId: 'test-base',
    baseName: 'Test Base',
    tier: 1,
    type: 'weapon',
    rarity: 'magic',
    affixes: [],
    implicits: [
      { type: 'allStats', tier: 1, value: value, isPercent: true },
    ],
  });
  const wizard = CHARACTERS.wizard;
  const baseHp = 100 * wizard.hpMod;
  const baseSpeed = 7.5 * wizard.spdMod;
  const basePickup = 60;
  const baseDmgMult = 1;

  beforeEach(() => {
    const wizard = CHARACTERS.wizard;
    player = new Player(
      'wizard',
      wizard.hpMod,
      wizard.spdMod,
      'fireball',
      'MeteorSwarm',
      { health: 0, speed: 0, magnet: 0, damage: 0 }
    );
  });

  describe('allStats +3% should affect all stats correctly', () => {
    beforeEach(() => {
      const item = createAllStatsItem(3);
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);
    });

    it('should increase maxHp by 3% of base', () => {
      const expected = baseHp * 1.03; // base * (1 + allStats)
      expect(player.maxHp).toBeCloseTo(expected, 0.1);
    });

    it('should increase speed by 3% of base', () => {
      const expected = baseSpeed * 1.03 + 0; // base * (1 + allStats) + flat speed
      expect(player.speed).toBeCloseTo(expected, 0.1);
    });

    it('should increase dmgMult by 3% of base', () => {
      const expected = baseDmgMult * 1.03; // base * (1 + allStats)
      expect(player.dmgMult).toBeCloseTo(expected, 0.01);
    });

    it('should increase pickupRange by 3% of base', () => {
      const expected = basePickup * 1.03 + 0; // base * (1 + allStats) + flat magnet + flat pickupRadius
      expect(player.pickupRange).toBeCloseTo(expected, 0.1);
    });

    it('should NOT add allStats as flat value to projectiles', () => {
      expect(player.items.projectile).toBe(0); // Should stay at 0 (base)
    });
  });

  describe('allStats with different values', () => {
    it('should apply +5% allStats', () => {
      const item = createAllStatsItem(5);
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      expect(player.maxHp).toBeCloseTo(baseHp * 1.05, 0.1);
      expect(player.dmgMult).toBeCloseTo(1.05, 0.01);
    });

    it('should apply +10% allStats', () => {
      const item = createAllStatsItem(10);
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      expect(player.maxHp).toBeCloseTo(baseHp * 1.10, 0.1);
      expect(player.speed).toBeCloseTo(baseSpeed * 1.10, 0.1);
      expect(player.dmgMult).toBeCloseTo(1.10, 0.01);
    });

    it('should apply +15% allStats', () => {
      const item = createAllStatsItem(15);
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      expect(player.maxHp).toBeCloseTo(baseHp * 1.15, 0.1);
      expect(player.speed).toBeCloseTo(baseSpeed * 1.15, 0.1);
      expect(player.dmgMult).toBeCloseTo(1.15, 0.01);
    });
  });

  describe('allStats combined with other affixes', () => {
    it('should combine +3% allStats with +10% might', () => {
      const item: Item = {
        id: 'test',
        name: 'Test Item',
        baseId: 'test-base',
        baseName: 'Test Base',
        tier: 1,
        type: 'weapon',
        rarity: 'magic',
        affixes: [
          { type: 'percentDamage', tier: 1, value: 10, isPercent: true },
        ],
        implicits: [
          { type: 'allStats', tier: 1, value: 3, isPercent: true },
        ],
      };
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // 10% might + 3% allStats = 13% total
      expect(player.dmgMult).toBeCloseTo(1.13, 0.01);
    });

    it('should combine +3% allStats with +2 speed', () => {
      const item: Item = {
        id: 'test',
        name: 'Test Item',
        baseId: 'test-base',
        baseName: 'Test Base',
        tier: 1,
        type: 'accessory',
        rarity: 'magic',
        affixes: [
          { type: 'speed', tier: 1, value: 2, isPercent: false },
        ],
        implicits: [
          { type: 'allStats', tier: 1, value: 3, isPercent: true },
        ],
      };
      const loadout = {
        relic: null,
        weapon: null,
        helm: null,
        armor: null,
        accessory1: item,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // 2 flat speed + (7.5 * 0.03) = 2 + 0.225 = 2.225
      expect(player.speed).toBeCloseTo(baseSpeed * 1.03 + 2, 0.001);
    });

    it('should combine +3% allStats with +20 maxHp', () => {
      const item: Item = {
        id: 'test',
        name: 'Test Item',
        baseId: 'test-base',
        baseName: 'Test Base',
        tier: 1,
        type: 'helm',
        rarity: 'magic',
        affixes: [
          { type: 'maxHp', tier: 1, value: 20, isPercent: false },
        ],
        implicits: [
          { type: 'allStats', tier: 1, value: 3, isPercent: true },
        ],
      };
      const loadout = {
        relic: null,
        weapon: null,
        helm: item,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // 20 flat + (base * 0.03)
      expect(player.maxHp).toBeCloseTo(baseHp * 1.03 + 20, 0.1);
    });
  });

  describe('allStats with multiple items', () => {
    it('should stack +3% allStats from multiple items', () => {
      const item1 = createAllStatsItem(3);
      const item2 = createAllStatsItem(3);
      const loadout = {
        relic: null,
        weapon: item1,
        helm: item2,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // 6% allStats total from two items
      expect(player.maxHp).toBeCloseTo(baseHp * 1.06, 0.1);
      expect(player.dmgMult).toBeCloseTo(1.06, 0.01);
      expect(player.speed).toBeCloseTo(baseSpeed * 1.06, 0.1);
      expect(player.pickupRange).toBeCloseTo(basePickup * 1.06, 0.1);
    });
  });

  describe('allStats with different rarities', () => {
    const createRarityItem = (rarity: 'common' | 'magic' | 'rare' | 'legendary', value: number): Item => ({
      id: 'test',
      name: 'Test Item',
      baseId: 'test-base',
      baseName: 'Test Base',
      tier: 1,
      type: 'weapon',
      rarity,
      affixes: [],
      implicits: [
        { type: 'allStats', tier: 1, value, isPercent: true },
      ],
    });

    it('common rarity: +5% allStats', () => {
      const item = createRarityItem('common', 5);
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      expect(player.dmgMult).toBeCloseTo(1.05, 0.01);
    });

    it('magic rarity: +5% allStats', () => {
      const item = createRarityItem('magic', 5);
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      expect(player.dmgMult).toBeCloseTo(1.05, 0.01);
    });

    it('rare rarity: +10% allStats', () => {
      const item = createRarityItem('rare', 10);
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      expect(player.dmgMult).toBeCloseTo(1.10, 0.01);
    });

    it('legendary rarity: +15% allStats', () => {
      const item = createRarityItem('legendary', 15);
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      expect(player.dmgMult).toBeCloseTo(1.15, 0.01);
    });
  });

  describe('allStats edge cases', () => {
    it('should handle 0% allStats (no effect)', () => {
      const item = createAllStatsItem(0);
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // 0% allStats = no increase from allStats
      expect(player.maxHp).toBeCloseTo(baseHp + 0, 0.1);
      expect(player.dmgMult).toBeCloseTo(1.0, 0.01);
      expect(player.speed).toBeCloseTo(baseSpeed + 0, 0.1);
    });

    it('should handle negative allStats (penalty)', () => {
      const item: Item = {
        id: 'test',
        name: 'Test Item',
        baseId: 'test-base',
        baseName: 'Test Base',
        tier: 1,
        type: 'weapon',
        rarity: 'common',
        affixes: [],
        implicits: [
          { type: 'allStats', tier: 1, value: -5, isPercent: true },
        ],
      };
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // -5% allStats should reduce stats
      expect(player.maxHp).toBeCloseTo(baseHp * 0.95, 0.1);
      expect(player.dmgMult).toBeCloseTo(0.95, 0.01);
      expect(player.speed).toBeCloseTo(baseSpeed * 0.95, 0.1);
    });
  });

  describe('allStats does NOT affect flat values', () => {
    it('should NOT add allStats to projectiles', () => {
      const item: Item = {
        id: 'test',
        name: 'Test Item',
        baseId: 'test-base',
        baseName: 'Test Base',
        tier: 1,
        type: 'accessory',
        rarity: 'magic',
        affixes: [
          { type: 'projectiles', tier: 1, value: 2, isPercent: false },
        ],
        implicits: [
          { type: 'allStats', tier: 1, value: 3, isPercent: true },
        ],
      };
      const loadout = {
        relic: null,
        weapon: null,
        helm: null,
        armor: null,
        accessory1: item,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // Should be flat 2, NOT 2 + 0.03 (2.03)
      expect(player.items.projectile).toBe(2);
    });

    it('should NOT add allStats to pierce', () => {
      const item: Item = {
        id: 'test',
        name: 'Test Item',
        baseId: 'test-base',
        baseName: 'Test Base',
        tier: 1,
        type: 'weapon',
        rarity: 'magic',
        affixes: [
          { type: 'pierce', tier: 1, value: 2, isPercent: false },
        ],
        implicits: [
          { type: 'allStats', tier: 1, value: 3, isPercent: true },
        ],
      };
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // Should be flat 2, NOT 2 + 0.03
      expect(player.items.pierce).toBe(2);
    });

    it('should NOT add allStats to flatDamage', () => {
      const item: Item = {
        id: 'test',
        name: 'Test Item',
        baseId: 'test-base',
        baseName: 'Test Base',
        tier: 1,
        type: 'weapon',
        rarity: 'magic',
        affixes: [
          { type: 'flatDamage', tier: 1, value: 5, isPercent: false },
        ],
        implicits: [
          { type: 'allStats', tier: 1, value: 3, isPercent: true },
        ],
      };
      const loadout = {
        relic: null,
        weapon: item,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // Should be flat 5, NOT 5 + 0.03 (5.03)
      expect(player.flatDamage).toBe(5);
    });

    it('should NOT add allStats to armor', () => {
      const item: Item = {
        id: 'test',
        name: 'Test Item',
        baseId: 'test-base',
        baseName: 'Test Base',
        tier: 1,
        type: 'armor',
        rarity: 'magic',
        affixes: [
          { type: 'armor', tier: 1, value: 5, isPercent: false },
        ],
        implicits: [
          { type: 'allStats', tier: 1, value: 3, isPercent: true },
        ],
      };
      const loadout = {
        relic: null,
        weapon: null,
        helm: null,
        armor: item,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // Armor is flat and should ignore allStats
      expect(player.armor).toBe(5);
    });

    it('should NOT add allStats to luck', () => {
      const item: Item = {
        id: 'test',
        name: 'Test Item',
        baseId: 'test-base',
        baseName: 'Test Base',
        tier: 1,
        type: 'accessory',
        rarity: 'magic',
        affixes: [
          { type: 'luck', tier: 1, value: 5, isPercent: false },
        ],
        implicits: [
          { type: 'allStats', tier: 1, value: 3, isPercent: true },
        ],
      };
      const loadout = {
        relic: null,
        weapon: null,
        helm: null,
        armor: null,
        accessory1: item,
        accessory2: null,
        accessory3: null,
      };
      const stats = ItemStats.calculate(loadout);
      player.updateLoadoutStats(stats);

      // Should be flat 5, NOT 5 + 0.03 (5.03)
      expect(player.luck).toBe(5);
    });
  });
});
