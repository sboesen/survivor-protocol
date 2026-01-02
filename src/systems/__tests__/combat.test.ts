import { describe, it, expect } from 'vitest';
import {
  checkProjectileEnemyCollision,
  findEnemiesInExplosion,
  applyKnockback,
  checkPlayerEnemyCollision,
  checkProjectilePlayerCollision,
  findEnemiesNearPoint,
  calculateBubbleSplit,
} from '../combat';

// Mock Projectile
class MockProjectile {
  constructor(
    public x: number,
    public y: number,
    public radius: number,
    public isHostile: boolean,
    public dmg: number,
    public hitList: any[] = [],
    public pierce: number = 1,
    public isCrit: boolean = false,
    public knockback?: number,
    public explodeRadius?: number
  ) {}
}

// Mock Enemy
class MockEnemy {
  constructor(public x: number, public y: number, public radius: number, public id: number) {}
}

describe('collisions', () => {
  describe('checkProjectileEnemyCollision', () => {
    const createEnemies = (positions: [number, number, number][]) => {
      return positions.map((pos, i) => new MockEnemy(pos[0], pos[1], pos[2], i) as any);
    };

    it('should return no hit when projectile is hostile', () => {
      const proj = new MockProjectile(100, 100, 5, true, 10);
      const enemies = createEnemies([[100, 100, 10]]);
      const result = checkProjectileEnemyCollision(proj, enemies);

      expect(result.hit).toBe(false);
      expect(result.enemy).toBeNull();
    });

    it('should hit enemy in range', () => {
      const proj = new MockProjectile(100, 100, 5, false, 10);
      const enemies = createEnemies([[105, 100, 5]]); // Distance 5, touching
      const result = checkProjectileEnemyCollision(proj, enemies);

      expect(result.hit).toBe(true);
      expect(result.enemy).toBe(enemies[0]);
    });

    it('should not hit enemy out of range', () => {
      const proj = new MockProjectile(100, 100, 5, false, 10);
      const enemies = createEnemies([[120, 100, 5]]); // Distance 20
      const result = checkProjectileEnemyCollision(proj, enemies);

      expect(result.hit).toBe(false);
    });

    it('should not hit already hit enemies', () => {
      const proj = new MockProjectile(100, 100, 5, false, 10);
      const enemies = createEnemies([[105, 100, 5]]);
      proj.hitList.push(enemies[0]);
      const result = checkProjectileEnemyCollision(proj, enemies);

      expect(result.hit).toBe(false);
    });

    it('should detect split flag', () => {
      const proj = new MockProjectile(100, 100, 5, false, 10);
      (proj as any).splits = true;
      const enemies = createEnemies([[105, 100, 5]]);
      const result = checkProjectileEnemyCollision(proj, enemies);

      expect(result.shouldSplit).toBe(true);
    });

    it('should detect explode radius', () => {
      const proj = new MockProjectile(100, 100, 5, false, 10);
      proj.explodeRadius = 50;
      const enemies = createEnemies([[105, 100, 5]]);
      const result = checkProjectileEnemyCollision(proj, enemies);

      expect(result.shouldExplode).toBe(true);
      expect(result.explodeRadius).toBe(50);
    });

    it('should calculate knockback angle', () => {
      const proj = new MockProjectile(100, 100, 5, false, 10);
      proj.knockback = 10;
      const enemies = createEnemies([[105, 100, 5]]); // To the right, actually colliding
      const result = checkProjectileEnemyCollision(proj, enemies);

      expect(result.knockback).toBeDefined();
      expect(result.knockback!.angle).toBeCloseTo(0, 5); // Angle 0 = right
      expect(result.knockback!.force).toBe(10);
    });
  });

  describe('findEnemiesInExplosion', () => {
    const createEnemies = (positions: [number, number, number][]) => {
      return positions.map((pos, i) => new MockEnemy(pos[0], pos[1], pos[2], i) as any);
    };

    it('should find enemies in explosion radius', () => {
      const enemies = createEnemies([
        [100, 100, 5],
        [110, 100, 5],
        [150, 100, 5], // Too far
      ]);
      const result = findEnemiesInExplosion(100, 100, 30, enemies);

      expect(result.enemies).toHaveLength(2);
      expect(result.enemies).toContain(enemies[0]);
      expect(result.enemies).toContain(enemies[1]);
      expect(result.damageMultiplier).toBe(0.5);
    });

    it('should exclude specified enemies', () => {
      const enemies = createEnemies([
        [100, 100, 5],
        [110, 100, 5],
      ]);
      const result = findEnemiesInExplosion(100, 100, 30, enemies, [enemies[0]]);

      expect(result.enemies).toHaveLength(1);
      expect(result.enemies[0]).toBe(enemies[1]);
    });

    it('should return empty when no enemies in range', () => {
      const enemies = createEnemies([[200, 200, 5]]);
      const result = findEnemiesInExplosion(100, 100, 30, enemies);

      expect(result.enemies).toHaveLength(0);
    });

    it('should not include enemies exactly at radius (exclusive boundary)', () => {
      const enemies = createEnemies([[130, 100, 5]]);
      const result = findEnemiesInExplosion(100, 100, 30, enemies);

      // Distance is exactly 30, which is not < 30
      expect(result.enemies).toHaveLength(0);
    });
  });

  describe('applyKnockback', () => {
    it('should knockback enemy to the right', () => {
      const enemy = new MockEnemy(100, 100, 5, 1) as any;
      const result = applyKnockback(enemy, 0, 10);

      expect(result.x).toBe(110);
      expect(result.y).toBe(100);
    });

    it('should knockback enemy downward', () => {
      const enemy = new MockEnemy(100, 100, 5, 1) as any;
      const result = applyKnockback(enemy, Math.PI / 2, 10);

      expect(result.x).toBe(100);
      expect(result.y).toBe(110);
    });

    it('should knockback enemy diagonally', () => {
      const enemy = new MockEnemy(100, 100, 5, 1) as any;
      const result = applyKnockback(enemy, Math.PI / 4, 10);

      expect(result.x).toBeCloseTo(107.07, 1);
      expect(result.y).toBeCloseTo(107.07, 1);
    });

    it('should wrap position at world boundary', () => {
      const enemy = new MockEnemy(1995, 100, 5, 1) as any;
      const result = applyKnockback(enemy, 0, 10);

      expect(result.x).toBe(5); // Wraps to 5
      expect(result.y).toBe(100);
    });
  });

  describe('checkPlayerEnemyCollision', () => {
    const createEnemies = (positions: [number, number, number][]) => {
      return positions.map((pos, i) => new MockEnemy(pos[0], pos[1], pos[2], i) as any);
    };

    it('should not collide when far from enemies', () => {
      const enemies = createEnemies([[200, 200, 10]]);
      const result = checkPlayerEnemyCollision(100, 100, 10, enemies, 0, false);

      expect(result.collided).toBe(false);
    });

    it('should collide when touching enemy', () => {
      const enemies = createEnemies([[115, 100, 10]]); // Distance 15, radii sum = 20
      const result = checkPlayerEnemyCollision(100, 100, 10, enemies, 0, false);

      expect(result.collided).toBe(true);
      expect(result.damage).toBe(5);
    });

    it('should not damage when immune', () => {
      const enemies = createEnemies([[115, 100, 10]]);
      const result = checkPlayerEnemyCollision(100, 100, 10, enemies, 30, true);

      expect(result.collided).toBe(false);
    });

    it('should damage every 30 frames', () => {
      const enemies = createEnemies([[115, 100, 10]]);

      // Frame 0 - should damage
      let result = checkPlayerEnemyCollision(100, 100, 10, enemies, 0, false);
      expect(result.shouldDamage).toBe(true);

      // Frame 15 - should not damage
      result = checkPlayerEnemyCollision(100, 100, 10, enemies, 15, false);
      expect(result.shouldDamage).toBe(false);

      // Frame 30 - should damage
      result = checkPlayerEnemyCollision(100, 100, 10, enemies, 30, false);
      expect(result.shouldDamage).toBe(true);

      // Frame 60 - should damage
      result = checkPlayerEnemyCollision(100, 100, 10, enemies, 60, false);
      expect(result.shouldDamage).toBe(true);
    });
  });

  describe('checkProjectilePlayerCollision', () => {
    it('should not hit non-hostile projectiles', () => {
      const proj = new MockProjectile(100, 100, 5, false, 10);
      const result = checkProjectilePlayerCollision(proj, 100, 100, 10);

      expect(result).toBe(false);
    });

    it('should hit when touching', () => {
      const proj = new MockProjectile(100, 100, 5, true, 10);
      const result = checkProjectilePlayerCollision(proj, 105, 100, 10);

      expect(result).toBe(true);
    });

    it('should not hit when far', () => {
      const proj = new MockProjectile(100, 100, 5, true, 10);
      const result = checkProjectilePlayerCollision(proj, 150, 100, 10);

      expect(result).toBe(false);
    });

    it('should hit even when immune (collision is separate from damage)', () => {
      const proj = new MockProjectile(100, 100, 5, true, 10);
      const result = checkProjectilePlayerCollision(proj, 100, 100, 10);

      // Collision is detected; immunity is a separate concern handled by caller
      expect(result).toBe(true);
    });
  });

  describe('findEnemiesNearPoint', () => {
    const createEnemies = (positions: [number, number, number][]) => {
      return positions.map((pos, i) => new MockEnemy(pos[0], pos[1], pos[2], i) as any);
    };

    it('should find enemies near point', () => {
      const enemies = createEnemies([
        [100, 100, 5],
        [105, 100, 5],
        [150, 100, 5],
      ]);
      const result = findEnemiesNearPoint(100, 100, 20, enemies);

      expect(result).toHaveLength(2);
      expect(result).toContain(enemies[0]);
      expect(result).toContain(enemies[1]);
    });

    it('should exclude specified enemies', () => {
      const enemies = createEnemies([
        [100, 100, 5],
        [105, 100, 5],
      ]);
      const result = findEnemiesNearPoint(100, 100, 20, enemies, [enemies[0]]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(enemies[1]);
    });

    it('should return empty when no enemies nearby', () => {
      const enemies = createEnemies([[200, 200, 5]]);
      const result = findEnemiesNearPoint(100, 100, 20, enemies);

      expect(result).toHaveLength(0);
    });

    it('should not include enemies exactly at radius (exclusive boundary)', () => {
      const enemies = createEnemies([[130, 100, 5]]);
      const result = findEnemiesNearPoint(100, 100, 30, enemies);

      // Distance is exactly 30, which is not < 30
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateBubbleSplit', () => {
    it('should create 3 split bubbles', () => {
      const result = calculateBubbleSplit(100, 100, 10, false);

      expect(result).toHaveLength(3);
    });

    it('should position bubbles at origin', () => {
      const result = calculateBubbleSplit(100, 100, 10, false);

      result.forEach(bubble => {
        expect(bubble.x).toBe(100);
        expect(bubble.y).toBe(100);
      });
    });

    it('should spread bubbles in 3 directions', () => {
      const result = calculateBubbleSplit(100, 100, 10, false);

      // 3 bubbles at 0, 2pi/3, 4pi/3 radians
      expect(result[0].vx).toBeCloseTo(3, 1); // 0 radians
      expect(result[1].vx).toBeCloseTo(-1.5, 1); // 2pi/3 radians
      expect(result[2].vx).toBeCloseTo(-1.5, 1); // 4pi/3 radians
    });

    it('should halve damage', () => {
      const result = calculateBubbleSplit(100, 100, 10, false);

      result.forEach(bubble => {
        expect(bubble.dmg).toBe(5);
      });
    });

    it('should preserve crit status', () => {
      const result = calculateBubbleSplit(100, 100, 10, true);

      result.forEach(bubble => {
        expect(bubble.isCrit).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty enemy list', () => {
      const proj = new MockProjectile(100, 100, 5, false, 10);
      const result = checkProjectileEnemyCollision(proj, []);

      expect(result.hit).toBe(false);
    });

    it('should handle zero radius', () => {
      const proj = new MockProjectile(100, 100, 0, false, 10);
      const enemies = [new MockEnemy(100, 100, 0, 1) as any];
      const result = checkProjectileEnemyCollision(proj, enemies);

      // Zero radius objects only "touch" at the exact same point
      // Distance is 0, radii sum is 0, so 0 < 0 is false
      expect(result.hit).toBe(false);
    });

    it('should handle negative positions', () => {
      const enemy = new MockEnemy(-10, -10, 5, 1) as any;
      const result = applyKnockback(enemy, 0, 10);

      expect(result.x).toBe(0); // Wraps to positive
    });
  });
});
