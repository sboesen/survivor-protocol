import { describe, it, expect } from 'vitest';
import {
  getWrappedDistanceVector,
  calculateLootMagnetPosition,
  isLootInRange,
  canCollectLoot,
  calculateLootEffect,
  applyLootEffectToPlayer,
} from '../lootCollection';

// Mock CONFIG
vi.mock('../../config', () => ({
  CONFIG: {
    worldSize: 2000,
  },
}));

describe('lootCollection', () => {
  describe('getWrappedDistanceVector', () => {
    it('should calculate direct distance when close', () => {
      const result = getWrappedDistanceVector(100, 100, 150, 150);
      expect(result.dx).toBe(50);
      expect(result.dy).toBe(50);
    });

    it('should wrap around world bounds for positive X', () => {
      // Player at 1950, loot at 50 -> distance should wrap (50 is actually 2050)
      const result = getWrappedDistanceVector(50, 100, 1950, 100);
      expect(result.dx).toBe(-100); // 1950 - 50 - 2000 = -100
      expect(result.dy).toBe(0);
    });

    it('should wrap around world bounds for negative X', () => {
      // Player at 50, loot at 1950 -> distance should wrap
      const result = getWrappedDistanceVector(1950, 100, 50, 100);
      expect(result.dx).toBe(100); // 50 - 1950 + 2000 = 100
      expect(result.dy).toBe(0);
    });

    it('should wrap around world bounds for positive Y', () => {
      const result = getWrappedDistanceVector(100, 50, 100, 1950);
      expect(result.dx).toBe(0);
      expect(result.dy).toBe(-100); // 1950 - 50 = 1900 > 1000, so 1900 - 2000 = -100
    });

    it('should wrap around world bounds for negative Y', () => {
      const result = getWrappedDistanceVector(100, 1950, 100, 50);
      expect(result.dx).toBe(0);
      expect(result.dy).toBe(100); // 50 - 1950 = -1900 < -1000, so -1900 + 2000 = 100
    });

    it('should handle zero distance', () => {
      const result = getWrappedDistanceVector(100, 100, 100, 100);
      expect(result.dx).toBe(0);
      expect(result.dy).toBe(0);
    });

    it('should handle diagonal wrapping', () => {
      // Player at edge, loot at opposite edge
      const result = getWrappedDistanceVector(50, 50, 1950, 1950);
      expect(result.dx).toBe(-100); // 1950 - 50 = 1900 > 1000, so 1900 - 2000 = -100
      expect(result.dy).toBe(-100); // Same for Y
    });
  });

  describe('calculateLootMagnetPosition', () => {
    it('should move loot toward player', () => {
      const result = calculateLootMagnetPosition(100, 100, 150, 150, 0.5);
      // Should move halfway toward player
      expect(result.x).toBe(125);
      expect(result.y).toBe(125);
    });

    it('should handle strong magnet', () => {
      const result = calculateLootMagnetPosition(100, 100, 200, 100, 1.0);
      expect(result.x).toBe(200);
      expect(result.y).toBe(100);
    });

    it('should handle weak magnet', () => {
      const result = calculateLootMagnetPosition(100, 100, 150, 150, 0.1);
      expect(result.x).toBe(105);
      expect(result.y).toBe(105);
    });

    it('should wrap position when crossing world bounds', () => {
      // Position near edge, magnet pulls past edge
      const result = calculateLootMagnetPosition(1990, 100, 10, 100, 0.5);
      // dx = 10 - 1990 + 2000 = 20, 1990 + 20 * 0.5 = 2000, wraps to 0
      expect(result.x).toBe(0);
      expect(result.y).toBe(100);
    });

    it('should not move when magnet strength is 0', () => {
      const result = calculateLootMagnetPosition(100, 100, 200, 200, 0);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });
  });

  describe('isLootInRange', () => {
    it('should return true when loot is in range', () => {
      const result = isLootInRange(100, 100, 120, 120, 50);
      expect(result).toBe(true);
    });

    it('should return false when loot is out of range', () => {
      const result = isLootInRange(100, 100, 200, 200, 50);
      expect(result).toBe(false);
    });

    it('should return true when exactly at range boundary', () => {
      const result = isLootInRange(100, 100, 150, 100, 50);
      expect(result).toBe(true);
    });

    it('should handle wrapped positions', () => {
      // Player at 1950, loot at 50, range 100
      const result = isLootInRange(50, 100, 1950, 100, 100);
      expect(result).toBe(true);
    });
  });

  describe('canCollectLoot', () => {
    it('should return true when loot can be collected', () => {
      const result = canCollectLoot(100, 100, 110, 100, 20);
      expect(result).toBe(true);
    });

    it('should return false when loot is too far', () => {
      const result = canCollectLoot(100, 100, 130, 100, 20);
      expect(result).toBe(false);
    });

    it('should return true when exactly at collection distance', () => {
      const result = canCollectLoot(100, 100, 120, 100, 20);
      expect(result).toBe(true);
    });

    it('should return true when at same position', () => {
      const result = canCollectLoot(100, 100, 100, 100, 20);
      expect(result).toBe(true);
    });
  });

  describe('calculateLootEffect', () => {
    it('should return XP effect for gem', () => {
      const result = calculateLootEffect('gem', 10, 50, 100);
      expect(result.type).toBe('xp');
      expect(result.xp).toBe(10);
      expect(result.message).toBe('+XP');
      expect(result.color).toBe('#0f0');
    });

    it('should return chest effect for chest', () => {
      const result = calculateLootEffect('chest', 0, 50, 100);
      expect(result.type).toBe('chest');
      expect(result.message).toBe('CHEST');
      expect(result.color).toBe('#ff0');
    });

    it('should return heart effect with heal amount', () => {
      const result = calculateLootEffect('heart', 0, 50, 100);
      expect(result.type).toBe('heart');
      expect(result.hp).toBe(30); // Can heal full 30
      expect(result.message).toBe('+HP');
      expect(result.color).toBe('#0f0');
    });

    it('should cap heal at max HP', () => {
      const result = calculateLootEffect('heart', 0, 90, 100);
      expect(result.type).toBe('heart');
      expect(result.hp).toBe(10); // Only 10 HP to max
    });

    it('should return 0 heal when at full HP', () => {
      const result = calculateLootEffect('heart', 0, 100, 100);
      expect(result.type).toBe('heart');
      expect(result.hp).toBe(0);
    });

    it('should return none for unknown type', () => {
      const result = calculateLootEffect('unknown', 0, 50, 100);
      expect(result.type).toBe('none');
    });
  });

  describe('applyLootEffectToPlayer', () => {
    it('should return XP amount for gem', () => {
      const mockPlayer = { hp: 50, maxHp: 100 } as any;
      const effect = calculateLootEffect('gem', 25, 50, 100);
      const xpGained = applyLootEffectToPlayer(mockPlayer, effect);
      expect(xpGained).toBe(25);
    });

    it('should heal player for heart', () => {
      const mockPlayer = { hp: 50, maxHp: 100 } as any;
      const effect = calculateLootEffect('heart', 0, 50, 100);
      applyLootEffectToPlayer(mockPlayer, effect);
      expect(mockPlayer.hp).toBe(80);
    });

    it('should cap healing at max HP', () => {
      const mockPlayer = { hp: 90, maxHp: 100 } as any;
      const effect = calculateLootEffect('heart', 0, 90, 100);
      applyLootEffectToPlayer(mockPlayer, effect);
      expect(mockPlayer.hp).toBe(100);
    });

    it('should return 0 for non-XP loot', () => {
      const mockPlayer = { hp: 50, maxHp: 100 } as any;
      const heartEffect = calculateLootEffect('heart', 0, 50, 100);
      expect(applyLootEffectToPlayer(mockPlayer, heartEffect)).toBe(0);

      const chestEffect = calculateLootEffect('chest', 0, 50, 100);
      expect(applyLootEffectToPlayer(mockPlayer, chestEffect)).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very large distances', () => {
      const result = isLootInRange(0, 0, 10000, 10000, 50000);
      expect(result).toBe(true);
    });

    it('should handle negative positions', () => {
      const result = calculateLootMagnetPosition(-100, -100, 0, 0, 0.5);
      // Should still work with wrapping
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeLessThan(2000);
    });

    it('should handle zero pickup range', () => {
      const result = isLootInRange(100, 100, 100, 100, 0);
      // Only exactly same position counts
      expect(result).toBe(true);
    });

    it('should handle negative magnet strength (should push away)', () => {
      const result = calculateLootMagnetPosition(100, 100, 150, 100, -0.5);
      expect(result.x).toBeLessThan(100); // Pushed away
    });
  });
});
