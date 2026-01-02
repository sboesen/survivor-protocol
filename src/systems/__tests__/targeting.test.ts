import { describe, it, expect } from 'vitest';
import {
  calculateWrappedDistance,
  findNearestEnemy,
  calculateWrappedAngle,
  findEnemiesInRadius,
} from '../targeting';

// Mock CONFIG
vi.mock('../../config', () => ({
  CONFIG: {
    worldSize: 2000,
  },
}));

// Mock Enemy class
class MockEnemy {
  constructor(public x: number, public y: number, public id: number) {}
}

describe('targeting', () => {
  describe('calculateWrappedDistance', () => {
    it('should calculate direct distance', () => {
      const result = calculateWrappedDistance(100, 100, 150, 100);
      expect(result).toBe(50);
    });

    it('should calculate diagonal distance', () => {
      const result = calculateWrappedDistance(0, 0, 30, 40);
      expect(result).toBe(50); // 3-4-5 triangle
    });

    it('should wrap around world X positive', () => {
      // Player at 1950, enemy at 50 -> distance is 100 (not 1900)
      const result = calculateWrappedDistance(1950, 100, 50, 100);
      expect(result).toBe(100);
    });

    it('should wrap around world X negative', () => {
      // Player at 50, enemy at 1950
      const result = calculateWrappedDistance(50, 100, 1950, 100);
      expect(result).toBe(100);
    });

    it('should wrap around world Y positive', () => {
      const result = calculateWrappedDistance(100, 1950, 100, 50);
      expect(result).toBe(100);
    });

    it('should wrap around world Y negative', () => {
      const result = calculateWrappedDistance(100, 50, 100, 1950);
      expect(result).toBe(100);
    });

    it('should wrap both X and Y', () => {
      const result = calculateWrappedDistance(1950, 1950, 50, 50);
      expect(result).toBeCloseTo(141.4, 1); // sqrt(100^2 + 100^2)
    });

    it('should return 0 for same position', () => {
      const result = calculateWrappedDistance(100, 100, 100, 100);
      expect(result).toBe(0);
    });
  });

  describe('findNearestEnemy', () => {
    const createEnemies = (positions: [number, number][]) => {
      return positions.map((pos, i) => new MockEnemy(pos[0], pos[1], i) as any);
    };

    it('should return null with no enemies', () => {
      const result = findNearestEnemy([], 100, 100, 400);
      expect(result.enemy).toBeNull();
      expect(result.distance).toBe(400);
    });

    it('should find nearest enemy', () => {
      const enemies = createEnemies([[150, 100], [200, 100], [300, 100]]);
      const result = findNearestEnemy(enemies, 100, 100, 400);
      expect(result.enemy).toBe(enemies[0]);
      expect(result.distance).toBe(50);
    });

    it('should respect max distance', () => {
      const enemies = createEnemies([[150, 100], [200, 100]]);
      const result = findNearestEnemy(enemies, 100, 100, 40);
      expect(result.enemy).toBeNull();
      expect(result.distance).toBe(40);
    });

    it('should handle wrapped positions', () => {
      // Player at 1950, enemies at 50, 100
      const enemies = createEnemies([[50, 100], [100, 100]]);
      const result = findNearestEnemy(enemies, 1950, 100, 400);
      expect(result.enemy).toBe(enemies[0]); // Distance 100
      expect(result.distance).toBe(100);
    });

    it('should find nearest among many', () => {
      const enemies = createEnemies([
        [200, 100],
        [150, 100],
        [180, 100],
        [120, 100],
      ]);
      const result = findNearestEnemy(enemies, 100, 100, 400);
      expect(result.enemy).toBe(enemies[3]); // Distance 20
      expect(result.distance).toBe(20);
    });

    it('should return max distance when all enemies out of range', () => {
      const enemies = createEnemies([[500, 100], [600, 100]]);
      const result = findNearestEnemy(enemies, 100, 100, 100);
      expect(result.enemy).toBeNull();
      expect(result.distance).toBe(100);
    });
  });

  describe('calculateWrappedAngle', () => {
    it('should calculate angle to the right', () => {
      const result = calculateWrappedAngle(100, 100, 200, 100);
      expect(result).toBe(0);
    });

    it('should calculate angle downward', () => {
      const result = calculateWrappedAngle(100, 100, 100, 200);
      expect(result).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should calculate angle to the left', () => {
      const result = calculateWrappedAngle(100, 100, 0, 100);
      expect(result).toBe(Math.PI);
    });

    it('should calculate angle upward', () => {
      const result = calculateWrappedAngle(100, 100, 100, 0);
      expect(result).toBeCloseTo(-Math.PI / 2, 5);
    });

    it('should calculate diagonal angle', () => {
      const result = calculateWrappedAngle(0, 0, 100, 100);
      expect(result).toBeCloseTo(Math.PI / 4, 5);
    });

    it('should wrap around world edge', () => {
      // Player at 1950, target at 50 -> dx wraps to 100, pointing right
      const result = calculateWrappedAngle(1950, 100, 50, 100);
      expect(result).toBe(0); // Pointing right (dx positive after wrapping)
    });

    it('should wrap around world edge Y', () => {
      // Player at 1950, target at 50 -> dy wraps to 100, pointing down
      const result = calculateWrappedAngle(100, 1950, 100, 50);
      expect(result).toBeCloseTo(Math.PI / 2, 5); // Pointing down (dy positive after wrapping)
    });

    it('should handle wrapped diagonal', () => {
      // Player at 1950, 1950, target at 50, 50 -> both dx, dy wrap to positive
      const result = calculateWrappedAngle(1950, 1950, 50, 50);
      expect(result).toBeCloseTo(Math.PI / 4, 2); // Down-right diagonal
    });
  });

  describe('findEnemiesInRadius', () => {
    const createEnemies = (positions: [number, number][]) => {
      return positions.map((pos, i) => new MockEnemy(pos[0], pos[1], i) as any);
    };

    it('should return empty array with no enemies', () => {
      const result = findEnemiesInRadius([], 100, 100, 100);
      expect(result).toHaveLength(0);
    });

    it('should find enemies within radius', () => {
      const enemies = createEnemies([
        [120, 100],
        [180, 100],
        [250, 100],
      ]);
      const result = findEnemiesInRadius(enemies, 100, 100, 100);
      expect(result).toHaveLength(2);
      expect(result).toContain(enemies[0]);
      expect(result).toContain(enemies[1]);
    });

    it('should include enemies exactly at radius', () => {
      const enemies = createEnemies([[200, 100]]);
      const result = findEnemiesInRadius(enemies, 100, 100, 100);
      expect(result).toHaveLength(1);
    });

    it('should exclude enemies outside radius', () => {
      const enemies = createEnemies([[250, 100]]);
      const result = findEnemiesInRadius(enemies, 100, 100, 100);
      expect(result).toHaveLength(0);
    });

    it('should handle wrapped positions', () => {
      // Player at 1950, enemies at 50 (distance 100) and 100 (distance 150)
      const enemies = createEnemies([[50, 100], [100, 100]]);
      const result = findEnemiesInRadius(enemies, 1950, 100, 150);
      expect(result).toHaveLength(2); // Both within range
    });

    it('should find all enemies at center', () => {
      const enemies = createEnemies([
        [100, 100],
        [100, 100],
        [100, 100],
      ]);
      const result = findEnemiesInRadius(enemies, 100, 100, 10);
      expect(result).toHaveLength(3);
    });

    it('should handle zero radius', () => {
      const enemies = createEnemies([[100, 100], [101, 100]]);
      const result = findEnemiesInRadius(enemies, 100, 100, 0);
      expect(result).toHaveLength(1); // Only exact position
      expect(result[0]).toBe(enemies[0]);
    });
  });

  describe('edge cases', () => {
    it('should handle very large distances', () => {
      const result = calculateWrappedDistance(0, 0, 10000, 10000);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle zero radius for enemies', () => {
      const enemies = [new MockEnemy(100, 100, 1) as any];
      const result = findEnemiesInRadius(enemies, 100, 100, 0);
      expect(result).toHaveLength(1);
    });

    it('should handle same position angle', () => {
      const result = calculateWrappedAngle(100, 100, 100, 100);
      expect(result).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const result = calculateWrappedDistance(-100, -100, 100, 100);
      expect(result).toBeGreaterThan(0);
    });
  });
});
