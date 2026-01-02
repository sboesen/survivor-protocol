import { describe, it, expect } from 'vitest';
import {
  checkCollision,
  pointInCircle,
  calculateKnockback,
  isEnemyInHitList,
  findEntitiesInRadius,
  calculateAngle,
  shouldPierceExpire,
  type Position,
  type EntityWithPosition,
} from '../collision';

describe('collision', () => {
  describe('checkCollision', () => {
    it('should detect collision when circles overlap', () => {
      const result = checkCollision(0, 0, 10, 5, 0, 10);
      expect(result.collided).toBe(true);
      expect(result.distance).toBe(5);
    });

    it('should detect collision when circles touch', () => {
      const result = checkCollision(0, 0, 10, 20, 0, 10);
      expect(result.collided).toBe(true);
      expect(result.distance).toBe(20);
    });

    it('should not detect collision when circles are separate', () => {
      const result = checkCollision(0, 0, 10, 25, 0, 10);
      expect(result.collided).toBe(false);
      expect(result.distance).toBe(25);
    });

    it('should handle same position', () => {
      const result = checkCollision(50, 50, 10, 50, 50, 15);
      expect(result.collided).toBe(true);
      expect(result.distance).toBe(0);
    });

    it('should calculate correct distance', () => {
      const result = checkCollision(0, 0, 10, 30, 40, 10);
      // sqrt(30^2 + 40^2) = 50
      expect(result.distance).toBe(50);
    });

    it('should handle zero radius at same position', () => {
      const result = checkCollision(0, 0, 0, 0, 0, 0);
      // Zero radius circles at same position "touch" (distance 0 <= 0)
      expect(result.collided).toBe(true);
      expect(result.distance).toBe(0);
    });

    it('should not collide with zero radius at different positions', () => {
      const result = checkCollision(0, 0, 0, 1, 0, 0);
      // Zero radius circle at different position doesn't reach
      expect(result.collided).toBe(false);
      expect(result.distance).toBe(1);
    });

    it('should handle negative positions', () => {
      const result = checkCollision(-10, -10, 10, 0, 0, 15);
      expect(result.collided).toBe(true);
    });
  });

  describe('pointInCircle', () => {
    it('should return true when point is inside', () => {
      expect(pointInCircle(5, 5, 0, 0, 10)).toBe(true);
    });

    it('should return true when point is at center', () => {
      expect(pointInCircle(0, 0, 0, 0, 10)).toBe(true);
    });

    it('should return true when point is on edge', () => {
      expect(pointInCircle(10, 0, 0, 0, 10)).toBe(true);
    });

    it('should return false when point is outside', () => {
      expect(pointInCircle(15, 0, 0, 0, 10)).toBe(false);
    });

    it('should handle large radius', () => {
      expect(pointInCircle(50, 50, 0, 0, 100)).toBe(true);
    });

    it('should handle negative coordinates', () => {
      expect(pointInCircle(-5, -5, 0, 0, 10)).toBe(true);
    });
  });

  describe('calculateKnockback', () => {
    const worldSize = 2000;

    it('should push entity away from source', () => {
      const result = calculateKnockback(100, 100, 90, 100, 10, worldSize);
      // Knockback should push to the right (positive x)
      expect(result.x).toBeGreaterThan(100);
      expect(result.y).toBe(100); // y unchanged
    });

    it('should push from right to left', () => {
      const result = calculateKnockback(100, 100, 110, 100, 10, worldSize);
      // Knockback should push to the left (negative x, but wrapped)
      expect(result.x).toBeLessThan(100);
      expect(result.y).toBe(100);
    });

    it('should push from below', () => {
      const result = calculateKnockback(100, 100, 100, 110, 10, worldSize);
      // Knockback should push up (negative y, but wrapped)
      expect(result.x).toBe(100);
      expect(result.y).toBeLessThan(100);
    });

    it('should wrap around world bounds', () => {
      // Knockback that would go past 0 should wrap to worldSize
      const result = calculateKnockback(5, 100, 0, 100, 10, worldSize);
      expect(result.x).toBeLessThan(worldSize);
      expect(result.x).toBeGreaterThanOrEqual(0);
    });

    it('should wrap upper bound', () => {
      // Knockback that would go past worldSize should wrap to 0
      const result = calculateKnockback(1995, 100, 2000, 100, 10, worldSize);
      expect(result.x).toBeLessThan(worldSize);
      expect(result.x).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero force', () => {
      const result = calculateKnockback(100, 100, 90, 100, 0, worldSize);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should handle diagonal knockback', () => {
      const result = calculateKnockback(100, 100, 90, 90, 10, worldSize);
      expect(result.x).toBeGreaterThan(100);
      expect(result.y).toBeGreaterThan(100);
    });
  });

  describe('isEnemyInHitList', () => {
    const enemy1 = { id: 1 };
    const enemy2 = { id: 2 };
    const enemy3 = { id: 3 };

    it('should return false for empty hit list', () => {
      expect(isEnemyInHitList([], enemy1)).toBe(false);
    });

    it('should return false when enemy not in list', () => {
      expect(isEnemyInHitList([enemy1, enemy2], enemy3)).toBe(false);
    });

    it('should return true when enemy is in list', () => {
      expect(isEnemyInHitList([enemy1, enemy2], enemy2)).toBe(true);
    });

    it('should handle duplicates', () => {
      expect(isEnemyInHitList([enemy1, enemy1, enemy2], enemy1)).toBe(true);
    });

    it('should handle null/undefined', () => {
      expect(isEnemyInHitList([null, undefined], null)).toBe(true);
      expect(isEnemyInHitList([enemy1], null)).toBe(false);
    });
  });

  describe('findEntitiesInRadius', () => {
    interface TestEntity extends EntityWithPosition {
      id: number;
    }

    const entities: TestEntity[] = [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 10, y: 0 },
      { id: 3, x: 20, y: 0 },
      { id: 4, x: 100, y: 100 },
      { id: 5, x: 5, y: 5 },
    ];

    it('should find entities within radius', () => {
      const result = findEntitiesInRadius(0, 0, 15, entities);
      expect(result).toHaveLength(3); // ids 1, 2, 5
      expect(result.map(e => e.id).sort()).toEqual([1, 2, 5]);
    });

    it('should find entity at center point', () => {
      const result = findEntitiesInRadius(0, 0, 5, entities);
      expect(result).toHaveLength(1); // only id 1 (entity 5 is at ~7.07 distance)
      expect(result.map(e => e.id)).toContain(1);
    });

    it('should return empty array when no entities in radius', () => {
      const result = findEntitiesInRadius(200, 200, 10, entities);
      expect(result).toHaveLength(0);
    });

    it('should include entities on the edge', () => {
      const result = findEntitiesInRadius(0, 0, 10, entities);
      expect(result.map(e => e.id)).toContain(2); // at distance 10
    });

    it('should exclude entities outside radius', () => {
      const result = findEntitiesInRadius(0, 0, 15, entities);
      expect(result.map(e => e.id)).not.toContain(3); // at distance 20
    });

    it('should handle empty entity list', () => {
      const result = findEntitiesInRadius(0, 0, 100, []);
      expect(result).toHaveLength(0);
    });

    it('should handle zero radius', () => {
      const result = findEntitiesInRadius(0, 0, 0, entities);
      // With radius 0, only entities exactly at (0,0) match
      expect(result.map(e => e.id)).toContain(1);
    });
  });

  describe('calculateAngle', () => {
    it('should calculate angle to the right', () => {
      const angle = calculateAngle(0, 0, 10, 0);
      expect(angle).toBeCloseTo(0, 5);
    });

    it('should calculate angle downward', () => {
      const angle = calculateAngle(0, 0, 0, 10);
      expect(angle).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should calculate angle to the left', () => {
      const angle = calculateAngle(0, 0, -10, 0);
      expect(angle).toBeCloseTo(Math.PI, 5);
    });

    it('should calculate angle upward', () => {
      const angle = calculateAngle(0, 0, 0, -10);
      expect(angle).toBeCloseTo(-Math.PI / 2, 5);
    });

    it('should calculate diagonal angle', () => {
      const angle = calculateAngle(0, 0, 10, 10);
      expect(angle).toBeCloseTo(Math.PI / 4, 5);
    });

    it('should handle same point', () => {
      const angle = calculateAngle(5, 5, 5, 5);
      expect(angle).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const angle = calculateAngle(-10, -10, 0, 0);
      expect(angle).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  describe('shouldPierceExpire', () => {
    it('should return true when pierce is 0', () => {
      expect(shouldPierceExpire(0)).toBe(true);
    });

    it('should return true when pierce is negative', () => {
      expect(shouldPierceExpire(-1)).toBe(true);
      expect(shouldPierceExpire(-10)).toBe(true);
    });

    it('should return false when pierce is positive', () => {
      expect(shouldPierceExpire(1)).toBe(false);
      expect(shouldPierceExpire(5)).toBe(false);
      expect(shouldPierceExpire(100)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very large values in checkCollision', () => {
      const result = checkCollision(1000000, 1000000, 100, 1000100, 1000000, 100);
      expect(result.collided).toBe(true);
      expect(result.distance).toBe(100);
    });

    it('should handle very small values in checkCollision', () => {
      const result = checkCollision(0.001, 0.001, 0.01, 0.002, 0.001, 0.01);
      expect(result.collided).toBe(true);
    });

    it('should handle NaN gracefully in pointInCircle', () => {
      const result = pointInCircle(NaN, 0, 0, 0, 10);
      expect(result).toBe(false); // NaN comparison is false
    });

    it('should handle infinity in findEntitiesInRadius', () => {
      const entities = [{ x: Infinity, y: 0 }, { x: 0, y: 0 }];
      const result = findEntitiesInRadius(0, 0, 10, entities);
      // Infinity won't be within any finite radius
      expect(result).toHaveLength(1);
    });
  });
});
