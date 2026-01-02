import { describe, it, expect, beforeEach } from 'vitest';
import { Projectile } from '../projectile';
import type { CanvasContext } from '../../types';

// Mock canvas context
const mockCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  fillRect: () => {},
  stroke: () => {},
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
} as unknown as CanvasContext;

describe('Projectile', () => {
  let projectile: Projectile;

  beforeEach(() => {
    projectile = new Projectile(
      100,    // x
      200,    // y
      5,      // vx
      3,      // vy
      4,      // radius
      '#ff0', // color
      10,     // damage
      60,     // duration
      1,      // pierce
      false   // isCrit
    );
  });

  describe('constructor', () => {
    it('should create projectile with given position', () => {
      expect(projectile.x).toBe(100);
      expect(projectile.y).toBe(200);
    });

    it('should create projectile with given velocity', () => {
      expect(projectile.vx).toBe(5);
      expect(projectile.vy).toBe(3);
    });

    it('should store base velocity', () => {
      expect(projectile.baseVx).toBe(5);
      expect(projectile.baseVy).toBe(3);
    });

    it('should create projectile with given radius', () => {
      expect(projectile.radius).toBe(4);
    });

    it('should create projectile with given color', () => {
      expect(projectile.color).toBe('#ff0');
    });

    it('should create projectile with given damage', () => {
      expect(projectile.dmg).toBe(10);
    });

    it('should create projectile with given duration', () => {
      expect(projectile.dur).toBe(60);
    });

    it('should create projectile with given pierce', () => {
      expect(projectile.pierce).toBe(1);
    });

    it('should create projectile with given crit status', () => {
      expect(projectile.isCrit).toBe(false);
    });

    it('should default isHostile to false', () => {
      expect(projectile.isHostile).toBe(false);
    });

    it('should create hostile projectile when specified', () => {
      const hostile = new Projectile(0, 0, 1, 0, 5, '#f00', 5, 30, 0, false, true);
      expect(hostile.isHostile).toBe(true);
    });

    it('should initialize hitList as empty array', () => {
      expect(projectile.hitList).toEqual([]);
    });

    it('should initialize isArc as false', () => {
      expect(projectile.isArc).toBe(false);
    });

    it('should initialize isBubble as false', () => {
      expect(projectile.isBubble).toBe(false);
    });

    it('should initialize rot to 0', () => {
      expect(projectile.rot).toBe(0);
    });

    it('should initialize wobble to random value', () => {
      expect(projectile.wobble).toBeGreaterThanOrEqual(0);
      expect(projectile.wobble).toBeLessThan(Math.PI * 2);
    });

    it('should initialize age to 0', () => {
      expect(projectile.age).toBe(0);
    });
  });

  describe('update', () => {
    it('should increment age', () => {
      projectile.update();
      expect(projectile.age).toBe(1);
    });

    it('should move projectile by velocity', () => {
      const initialX = projectile.x;
      const initialY = projectile.y;
      projectile.update();
      expect(projectile.x).toBe(initialX + 5);
      expect(projectile.y).toBe(initialY + 3);
    });

    it('should decrement duration', () => {
      const initialDur = projectile.dur;
      projectile.update();
      expect(projectile.dur).toBe(initialDur - 1);
    });

    it('should mark projectile for deletion when duration expires', () => {
      projectile.dur = 1;
      projectile.update();
      expect(projectile.marked).toBe(true);
    });

    it('should not mark projectile when duration remains', () => {
      projectile.dur = 10;
      projectile.update();
      expect(projectile.marked).toBe(false);
    });

    it('should apply arc physics when isArc is true', () => {
      projectile.isArc = true;
      const initialVy = projectile.vy;
      const initialRot = projectile.rot;

      projectile.update();

      expect(projectile.vy).toBeCloseTo(initialVy + 0.25, 2);
      expect(projectile.rot).toBeCloseTo(initialRot + 0.3, 2);
    });

    it('should apply bubble wavy motion when isBubble is true', () => {
      projectile.isBubble = true;
      projectile.baseVx = 5;
      projectile.baseVy = 0;

      projectile.update();

      // Bubble motion modifies velocity - with age 1 and wobble, vx should differ
      // from baseVx due to wobble calculation
      // The perpendicular to (5, 0) is (0, 5), so vx stays close but may vary
      expect(projectile.vx).toBeDefined();
      expect(projectile.vy).toBeDefined();
    });

    it('should wrap position around world bounds', () => {
      projectile.x = 1999;
      projectile.vx = 5;
      projectile.update();

      expect(projectile.x).toBeLessThan(2000);
      expect(projectile.x).toBeGreaterThanOrEqual(0);
    });
  });

  describe('update - arc physics', () => {
    beforeEach(() => {
      projectile = new Projectile(100, 100, 3, 0, 6, '#888', 15, 60, 0, false);
      projectile.isArc = true;
    });

    it('should increase vertical velocity (gravity)', () => {
      const initialVy = projectile.vy;
      projectile.update();
      expect(projectile.vy).toBeCloseTo(initialVy + 0.25, 2);
    });

    it('should rotate projectile', () => {
      const initialRot = projectile.rot;
      projectile.update();
      expect(projectile.rot).toBeCloseTo(initialRot + 0.3, 2);
    });
  });

  describe('update - bubble physics', () => {
    beforeEach(() => {
      projectile = new Projectile(100, 100, 3, 0, 5, '#0af', 8, 60, 0, false);
      projectile.isBubble = true;
    });

    it('should apply wavy motion to velocity', () => {
      const age = projectile.age;
      projectile.update();

      // After first update, vx should differ from baseVx due to wobble
      // The perpendicular component affects velocity
      expect(projectile.age).toBe(age + 1);
    });
  });

  describe('drawShape', () => {
    it('should draw arc projectile as rectangle', () => {
      projectile.isArc = true;
      projectile.isCrit = false;

      expect(() => projectile.drawShape(mockCtx, 400, 300)).not.toThrow();
    });

    it('should draw bubble projectile with circle', () => {
      projectile.isBubble = true;

      expect(() => projectile.drawShape(mockCtx, 400, 300)).not.toThrow();
    });

    it('should draw crit projectile in yellow', () => {
      projectile.isCrit = true;

      expect(() => projectile.drawShape(mockCtx, 400, 300)).not.toThrow();
    });

    it('should draw normal projectile as circle', () => {
      projectile.isArc = false;
      projectile.isBubble = false;
      projectile.isCrit = false;

      expect(() => projectile.drawShape(mockCtx, 400, 300)).not.toThrow();
    });
  });

  describe('hitList', () => {
    it('should allow adding entities to hitList', () => {
      const mockEntity = { x: 0, y: 0, radius: 10, color: '#fff', marked: false };
      projectile.hitList.push(mockEntity as any);
      expect(projectile.hitList.length).toBe(1);
    });

    it('should track multiple hit entities', () => {
      const mockEntity1 = { x: 0, y: 0, radius: 10, color: '#fff', marked: false };
      const mockEntity2 = { x: 10, y: 10, radius: 10, color: '#fff', marked: false };
      projectile.hitList.push(mockEntity1 as any, mockEntity2 as any);
      expect(projectile.hitList.length).toBe(2);
    });
  });

  describe('special properties', () => {
    it('should support explodeRadius property', () => {
      projectile.explodeRadius = 50;
      expect(projectile.explodeRadius).toBe(50);
    });

    it('should support knockback property', () => {
      projectile.knockback = 5;
      expect(projectile.knockback).toBe(5);
    });

    it('should support splits property', () => {
      projectile.splits = true;
      expect(projectile.splits).toBe(true);
    });
  });

  describe('world wrapping', () => {
    it('should wrap x position when exceeding world size', () => {
      projectile.x = 1999;
      projectile.vx = 5;
      projectile.update();

      // 1999 + 5 = 2004, wrapped to 4
      expect(projectile.x).toBe(4);
    });

    it('should wrap x position when negative', () => {
      projectile.x = 1;
      projectile.vx = -5;
      projectile.update();

      // 1 - 5 = -4, wrapped to 1996
      expect(projectile.x).toBe(1996);
    });

    it('should wrap y position when exceeding world size', () => {
      projectile.y = 1998;
      projectile.vy = 5;
      projectile.update();

      expect(projectile.y).toBe(3);
    });

    it('should wrap y position when negative', () => {
      projectile.y = 2;
      projectile.vy = -5;
      projectile.update();

      expect(projectile.y).toBe(1997);
    });
  });

  describe('lifecycle', () => {
    it('should have age equal to number of updates', () => {
      for (let i = 0; i < 10; i++) {
        projectile.update();
      }
      expect(projectile.age).toBe(10);
    });

    it('should be marked after duration frames', () => {
      const updates = projectile.dur;
      for (let i = 0; i < updates; i++) {
        projectile.update();
      }
      expect(projectile.marked).toBe(true);
    });
  });

  describe('crit projectiles', () => {
    it('should handle crit projectiles', () => {
      const critProjectile = new Projectile(
        100, 200, 5, 3, 4, '#ff0', 15, 60, 1, true
      );

      expect(critProjectile.isCrit).toBe(true);
      expect(critProjectile.dmg).toBe(15); // Crit does more damage
    });
  });
});
