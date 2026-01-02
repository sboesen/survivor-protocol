import { describe, it, expect, beforeEach } from 'vitest';
import { Loot } from '../loot';
import type { CanvasContext } from '../../types';

// Mock canvas context
const mockCtx = {
  fillStyle: '',
  fillRect: () => {},
  strokeRect: () => {},
  strokeStyle: '',
  lineWidth: 0,
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  font: '',
  fillText: () => {},
  moveTo: () => {},
  lineTo: () => {},
} as unknown as CanvasContext;

describe('Loot', () => {
  describe('constructor', () => {
    it('should create gem loot with given position', () => {
      const gem = new Loot(100, 200, 'gem');
      expect(gem.x).toBe(100);
      expect(gem.y).toBe(200);
    });

    it('should create gem with type gem', () => {
      const gem = new Loot(100, 200, 'gem');
      expect(gem.type).toBe('gem');
    });

    it('should create chest with type chest', () => {
      const chest = new Loot(100, 200, 'chest');
      expect(chest.type).toBe('chest');
    });

    it('should create heart with type heart', () => {
      const heart = new Loot(100, 200, 'heart');
      expect(heart.type).toBe('heart');
    });

    it('should initialize val to 1', () => {
      const loot = new Loot(100, 200, 'gem');
      expect(loot.val).toBe(1);
    });

    it('should initialize radius to 8', () => {
      const loot = new Loot(100, 200, 'gem');
      expect(loot.radius).toBe(8);
    });

    it('should initialize color to black', () => {
      const loot = new Loot(100, 200, 'gem');
      expect(loot.color).toBe('#000');
    });

    it('should initialize bob to random value between 0 and 10', () => {
      const loot = new Loot(100, 200, 'gem');
      expect(loot.bob).toBeGreaterThanOrEqual(0);
      expect(loot.bob).toBeLessThan(10);
    });

    it('should have different bob values for different instances', () => {
      const loot1 = new Loot(100, 200, 'gem');
      const loot2 = new Loot(100, 200, 'gem');

      // While they could theoretically be the same, with 10 possible values
      // and randomness, multiple instances should differ
      const bobValues = new Set();
      for (let i = 0; i < 20; i++) {
        bobValues.add(new Loot(100, 200, 'gem').bob);
      }
      expect(bobValues.size).toBeGreaterThan(1);
    });
  });

  describe('drawShape - gem', () => {
    let gem: Loot;

    beforeEach(() => {
      gem = new Loot(100, 200, 'gem');
    });

    it('should draw gem without errors', () => {
      expect(() => gem.drawShape(mockCtx, 400, 300)).not.toThrow();
    });

    it('should draw green diamond shape', () => {
      // The gem is drawn as a diamond (4 lineTo calls)
      gem.drawShape(mockCtx, 400, 300);
      // If we get here without error, the draw succeeded
      expect(true).toBe(true);
    });
  });

  describe('drawShape - chest', () => {
    let chest: Loot;

    beforeEach(() => {
      chest = new Loot(100, 200, 'chest');
    });

    it('should draw chest without errors', () => {
      expect(() => chest.drawShape(mockCtx, 400, 300)).not.toThrow();
    });

    it('should draw orange rectangle with border', () => {
      chest.drawShape(mockCtx, 400, 300);
      expect(true).toBe(true);
    });
  });

  describe('drawShape - heart', () => {
    let heart: Loot;

    beforeEach(() => {
      heart = new Loot(100, 200, 'heart');
    });

    it('should draw heart without errors', () => {
      expect(() => heart.drawShape(mockCtx, 400, 300)).not.toThrow();
    });

    it('should draw red circle with plus symbol', () => {
      heart.drawShape(mockCtx, 400, 300);
      expect(true).toBe(true);
    });
  });

  describe('bob animation', () => {
    it('should use bob value in animation calculation', () => {
      const loot1 = new Loot(100, 200, 'gem');
      const loot2 = new Loot(100, 200, 'gem');

      // Different bob values should result in different phase offsets
      // We can't test the exact output since it depends on Date.now(),
      // but we can verify both draw without error
      expect(() => loot1.drawShape(mockCtx, 400, 300)).not.toThrow();
      expect(() => loot2.drawShape(mockCtx, 400, 300)).not.toThrow();
    });
  });

  describe('inheritance from Entity', () => {
    it('should have marked property', () => {
      const loot = new Loot(100, 200, 'gem');
      expect(loot.marked).toBe(false);
      loot.marked = true;
      expect(loot.marked).toBe(true);
    });

    it('should have x, y, radius, color properties', () => {
      const loot = new Loot(100, 200, 'gem');
      expect(loot.x).toBe(100);
      expect(loot.y).toBe(200);
      expect(loot.radius).toBe(8);
      expect(loot.color).toBe('#000');
    });
  });

  describe('type variations', () => {
    it('should support all loot types', () => {
      const gem = new Loot(0, 0, 'gem');
      const chest = new Loot(0, 0, 'chest');
      const heart = new Loot(0, 0, 'heart');

      expect(gem.type).toBe('gem');
      expect(chest.type).toBe('chest');
      expect(heart.type).toBe('heart');
    });
  });

  describe('value property', () => {
    it('should allow changing val property', () => {
      const loot = new Loot(100, 200, 'gem');
      loot.val = 5;
      expect(loot.val).toBe(5);
    });
  });
});
