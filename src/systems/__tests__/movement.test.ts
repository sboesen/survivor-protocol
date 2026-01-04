import { describe, it, expect } from 'vitest';
import {
  getInputDirection,
  hasMovementInput,
  normalizeMovement,
  calculateSpeedMultiplier,
  wrapPosition,
  calculateNewPosition,
  checkObstacleCollision,
  calculateMovementWithCollision,
  processPlayerMovement,
} from '../movement';
import type { Obstacle } from '../../entities/obstacle';
import type { InputState } from '../../types';

// Mock CONFIG
vi.mock('../../config', () => ({
  CONFIG: {
    worldSize: 2000,
  },
}));

describe('movement', () => {
  describe('getInputDirection', () => {
    const createInput = (keys: Record<string, boolean> = {}, joy: any = { active: false }): InputState => ({
      x: 0, y: 0, keys, joy, aimJoy: { active: false, x: 0, y: 0, ox: 0, oy: 0 }, ult: false,
    });

    it('should return zero direction when no input', () => {
      const input = createInput();
      const result = getInputDirection(input);
      expect(result.dx).toBe(0);
      expect(result.dy).toBe(0);
    });

    it('should get direction from W key', () => {
      const input = createInput({ w: true });
      const result = getInputDirection(input);
      expect(result.dx).toBe(0);
      expect(result.dy).toBe(-1);
    });

    it('should get direction from S key', () => {
      const input = createInput({ s: true });
      const result = getInputDirection(input);
      expect(result.dx).toBe(0);
      expect(result.dy).toBe(1);
    });

    it('should get direction from A key', () => {
      const input = createInput({ a: true });
      const result = getInputDirection(input);
      expect(result.dx).toBe(-1);
      expect(result.dy).toBe(0);
    });

    it('should get direction from D key', () => {
      const input = createInput({ d: true });
      const result = getInputDirection(input);
      expect(result.dx).toBe(1);
      expect(result.dy).toBe(0);
    });

    it('should combine keyboard directions', () => {
      const input = createInput({ w: true, d: true });
      const result = getInputDirection(input);
      expect(result.dx).toBe(1);
      expect(result.dy).toBe(-1);
    });

    it('should prioritize joystick over keyboard', () => {
      const input = createInput({ w: true }, { active: true, x: 0.5, y: 0.5, ox: 0, oy: 0 });
      const result = getInputDirection(input);
      expect(result.dx).toBe(0.5);
      expect(result.dy).toBe(0.5);
    });
  });

  describe('hasMovementInput', () => {
    it('should return false for zero direction', () => {
      expect(hasMovementInput({ dx: 0, dy: 0 })).toBe(false);
    });

    it('should return true for non-zero dx', () => {
      expect(hasMovementInput({ dx: 1, dy: 0 })).toBe(true);
    });

    it('should return true for non-zero dy', () => {
      expect(hasMovementInput({ dx: 0, dy: 1 })).toBe(true);
    });

    it('should return true for diagonal', () => {
      expect(hasMovementInput({ dx: 0.5, dy: 0.5 })).toBe(true);
    });
  });

  describe('normalizeMovement', () => {
    it('should not normalize unit vector', () => {
      const result = normalizeMovement({ dx: 1, dy: 0 });
      expect(result.dx).toBe(1);
      expect(result.dy).toBe(0);
    });

    it('should normalize diagonal vector', () => {
      const result = normalizeMovement({ dx: 1, dy: 1 });
      expect(result.dx).toBeCloseTo(0.707, 2);
      expect(result.dy).toBeCloseTo(0.707, 2);
    });

    it('should not normalize small vector', () => {
      const result = normalizeMovement({ dx: 0.5, dy: 0 });
      expect(result.dx).toBe(0.5);
      expect(result.dy).toBe(0);
    });

    it('should normalize large vector', () => {
      const result = normalizeMovement({ dx: 3, dy: 4 });
      expect(result.dx).toBe(0.6);
      expect(result.dy).toBe(0.8);
    });
  });

  describe('calculateSpeedMultiplier', () => {
    it('should return base speed when no ult', () => {
      expect(calculateSpeedMultiplier(5, 'DivineShield', 0)).toBe(5);
    });

    it('should return base speed when wrong ult', () => {
      expect(calculateSpeedMultiplier(5, 'IronWill', 10)).toBe(5);
    });

    it('should return base speed when ult not active', () => {
      expect(calculateSpeedMultiplier(5, 'ShadowStep', 0)).toBe(5);
    });

    it('should multiply speed when ShadowStep ult active', () => {
      expect(calculateSpeedMultiplier(5, 'ShadowStep', 10)).toBe(7.5);
    });
  });

  describe('wrapPosition', () => {
    it('should not wrap middle positions', () => {
      expect(wrapPosition(1000)).toBe(1000);
      expect(wrapPosition(500)).toBe(500);
    });

    it('should not wrap zero', () => {
      expect(wrapPosition(0)).toBe(0);
    });

    it('should not wrap max size', () => {
      expect(wrapPosition(2000)).toBe(0);
    });

    it('should wrap positive overflow', () => {
      expect(wrapPosition(2001)).toBe(1);
      expect(wrapPosition(2100)).toBe(100);
      expect(wrapPosition(2500)).toBe(500);
    });

    it('should handle negative values', () => {
      expect(wrapPosition(-1)).toBe(1999);
      expect(wrapPosition(-100)).toBe(1900);
    });
  });

  describe('calculateNewPosition', () => {
    it('should calculate new position', () => {
      const result = calculateNewPosition(100, 100, 1, 0, 5);
      expect(result.x).toBe(105);
      expect(result.y).toBe(100);
    });

    it('should wrap position', () => {
      const result = calculateNewPosition(1999, 100, 1, 0, 5);
      expect(result.x).toBe(4); // 1999 + 5 = 2004, wraps to 4
      expect(result.y).toBe(100);
    });

    it('should handle negative movement', () => {
      const result = calculateNewPosition(100, 100, -1, 0, 5);
      expect(result.x).toBe(95);
      expect(result.y).toBe(100);
    });

    it('should wrap negative overflow', () => {
      const result = calculateNewPosition(2, 100, -1, 0, 5);
      expect(result.x).toBe(1997); // 2 - 5 = -3, wraps to 1997
      expect(result.y).toBe(100);
    });
  });

  describe('checkObstacleCollision', () => {
    const createObstacle = (x: number, y: number, w: number, h: number, type: 'ruin' | 'font' = 'ruin'): Obstacle => ({
      x, y, w, h, type,
    } as any);

    it('should return false with no obstacles', () => {
      expect(checkObstacleCollision(100, 100, [])).toBe(false);
    });

    it('should return false when far from obstacle', () => {
      const obstacles = [createObstacle(500, 500, 100, 100)];
      expect(checkObstacleCollision(100, 100, obstacles)).toBe(false);
    });

    it('should return true when inside obstacle', () => {
      const obstacles = [createObstacle(100, 100, 100, 100)];
      expect(checkObstacleCollision(100, 100, obstacles)).toBe(true);
    });

    it('should skip fountain obstacles', () => {
      const obstacles = [createObstacle(100, 100, 100, 100, 'font')];
      expect(checkObstacleCollision(100, 100, obstacles)).toBe(false);
    });

    it('should return true near obstacle edge', () => {
      const obstacles = [createObstacle(100, 100, 100, 100)];
      // Center is 100,100, width/height 100, edges at 50,150
      expect(checkObstacleCollision(90, 100, obstacles)).toBe(true);
    });

    it('should return false outside obstacle range', () => {
      const obstacles = [createObstacle(100, 100, 100, 100)];
      expect(checkObstacleCollision(40, 100, obstacles)).toBe(false);
    });

    it('should ignore obstacles near world edge', () => {
      const obstacles = [createObstacle(20, 1000, 100, 100)];
      expect(checkObstacleCollision(20, 1000, obstacles)).toBe(false);
    });

    it('should check exact obstacle boundary', () => {
      const obstacles = [createObstacle(100, 100, 100, 100)];
      // 100 +/- 50 +/- 8 = 42 to 158
      // Note: boundary check is exclusive on left/top (x > boundary, y > boundary)
      expect(checkObstacleCollision(43, 100, obstacles)).toBe(true); // Just inside
      expect(checkObstacleCollision(42, 100, obstacles)).toBe(false); // At boundary
      expect(checkObstacleCollision(41, 100, obstacles)).toBe(false); // Outside
    });
  });

  describe('calculateMovementWithCollision', () => {
    const createObstacle = (x: number, y: number, w: number, h: number): Obstacle => ({
      x, y, w, h, type: 'ruin',
    } as any);

    it('should move when no collision', () => {
      const result = calculateMovementWithCollision(100, 100, 1, 0, 5, []);
      expect(result.x).toBe(105);
      expect(result.y).toBe(100);
    });

    it('should stop when blocked', () => {
      const obstacles = [createObstacle(110, 100, 100, 100)];
      const result = calculateMovementWithCollision(100, 100, 1, 0, 5, obstacles);
      // Should not move into obstacle
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should slide along wall (Y movement blocked)', () => {
      // Obstacle at (105.5, 120) with size 22x22
      // Bounds: x [86.5, 124.5], y [101, 139]
      // Blocks diagonal (103.5, 103.5) and Y-only (100, 103.5), but allows X-only (103.5, 100)
      const obstacles = [createObstacle(105.5, 120, 22, 22)];
      const result = calculateMovementWithCollision(100, 100, 0.707, 0.707, 5, obstacles);
      // Diagonal blocked, Y blocked, but X can move
      expect(result.x).toBeCloseTo(103.5, 1);
      expect(result.y).toBe(100);
    });

    it('should slide along wall (X movement blocked)', () => {
      // Obstacle at (120, 105.5) with size 22x22
      // Bounds: x [101, 139], y [86.5, 124.5]
      // Blocks diagonal (103.5, 103.5) and X-only (103.5, 100), but allows Y-only (100, 103.5)
      const obstacles = [createObstacle(120, 105.5, 22, 22)];
      const result = calculateMovementWithCollision(100, 100, 0.707, 0.707, 5, obstacles);
      // Diagonal blocked, X blocked, but Y can move
      expect(result.x).toBe(100);
      expect(result.y).toBeCloseTo(103.5, 1);
    });

    it('should wrap position when moving', () => {
      const result = calculateMovementWithCollision(1999, 100, 1, 0, 5, []);
      expect(result.x).toBe(4);
      expect(result.y).toBe(100);
    });
  });

  describe('processPlayerMovement', () => {
    const createInput = (keys: Record<string, boolean> = {}, joy: any = { active: false }): InputState => ({
      x: 0, y: 0, keys, joy, aimJoy: { active: false, x: 0, y: 0, ox: 0, oy: 0 }, ult: false, lastDx: 0, lastDy: 0,
    });

    it('should return same position when no input', () => {
      const input = createInput();
      const result = processPlayerMovement(100, 100, input, 5, 'ShadowStep', 0, []);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should move player with keyboard input', () => {
      const input = createInput({ d: true });
      const result = processPlayerMovement(100, 100, input, 5, 'ShadowStep', 0, []);
      expect(result.x).toBe(105);
      expect(result.y).toBe(100);
      expect(result.lastDx).toBe(1);
      expect(result.lastDy).toBe(0);
    });

    it('should apply ShadowStep ult speed bonus', () => {
      const input = createInput({ d: true });
      const result = processPlayerMovement(100, 100, input, 5, 'ShadowStep', 10, []);
      expect(result.x).toBe(107.5); // 5 * 1.5
      expect(result.y).toBe(100);
    });

    it('should normalize diagonal movement', () => {
      const input = createInput({ d: true, s: true });
      const result = processPlayerMovement(100, 100, input, 5, 'ShadowStep', 0, []);
      expect(result.x).toBeCloseTo(103.5, 0);
      expect(result.y).toBeCloseTo(103.5, 0);
    });

    it('should stop at obstacle', () => {
      const obstacles = [{ x: 110, y: 100, w: 100, h: 100, type: 'ruin' } as any];
      const input = createInput({ d: true });
      const result = processPlayerMovement(100, 100, input, 5, 'ShadowStep', 0, obstacles);
      expect(result.x).toBe(100); // Blocked
      expect(result.y).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle very large positions', () => {
      const result = calculateNewPosition(10000, 10000, 1, 0, 5);
      expect(result.x).toBe(5); // 10000 wraps many times
    });

    it('should handle zero speed', () => {
      const result = calculateNewPosition(100, 100, 1, 0, 0);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should handle negative speed', () => {
      const result = calculateNewPosition(100, 100, 1, 0, -5);
      expect(result.x).toBe(95);
      expect(result.y).toBe(100);
    });
  });
});
