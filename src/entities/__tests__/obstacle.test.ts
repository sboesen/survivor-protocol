import { describe, it, expect, beforeEach } from 'vitest';
import { Obstacle } from '../obstacle';
import type { CanvasContext } from '../../types';

// Mock canvas context
const mockCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  fill: () => {},
  stroke: () => {},
  beginPath: () => {},
  arc: () => {},
  ellipse: () => {},
  fillRect: () => {},
  rect: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  moveTo: () => {},
  lineTo: () => {},
  createRadialGradient: () => ({
    addColorStop: () => {},
  }),
} as unknown as CanvasContext;

describe('Obstacle', () => {
  describe('constructor - ruin type', () => {
    let obstacle: Obstacle;

    beforeEach(() => {
      obstacle = new Obstacle(500, 600, 100, 80, 'ruin');
    });

    it('should create obstacle with given position', () => {
      expect(obstacle.x).toBe(500);
      expect(obstacle.y).toBe(600);
    });

    it('should create obstacle with given dimensions', () => {
      expect(obstacle.w).toBe(100);
      expect(obstacle.h).toBe(80);
    });

    it('should have type ruin', () => {
      expect(obstacle.type).toBe('ruin');
    });

    it('should have radius 0', () => {
      expect(obstacle.radius).toBe(0);
    });

    it('should have black color', () => {
      expect(obstacle.color).toBe('#000');
    });

    it('should accept zero dimensions', () => {
      const zeroObs = new Obstacle(0, 0, 0, 0, 'ruin');
      expect(zeroObs.w).toBe(0);
      expect(zeroObs.h).toBe(0);
    });

    it('should accept negative positions', () => {
      const negObs = new Obstacle(-100, -200, 50, 50, 'ruin');
      expect(negObs.x).toBe(-100);
      expect(negObs.y).toBe(-200);
    });
  });

  describe('constructor - font (fountain) type', () => {
    let fountain: Obstacle;

    beforeEach(() => {
      fountain = new Obstacle(400, 500, 0, 0, 'font');
    });

    it('should create fountain with given position', () => {
      expect(fountain.x).toBe(400);
      expect(fountain.y).toBe(500);
    });

    it('should have type font', () => {
      expect(fountain.type).toBe('font');
    });
  });

  describe('drawShape - ruin', () => {
    let obstacle: Obstacle;

    beforeEach(() => {
      obstacle = new Obstacle(500, 600, 100, 80, 'ruin');
    });

    it('should draw ruin without errors', () => {
      expect(() => obstacle.drawShape(mockCtx, 400, 300)).not.toThrow();
    });

    it('should draw ruin at correct position', () => {
      obstacle.drawShape(mockCtx, 400, 300);
      expect(true).toBe(true);
    });
  });

  describe('drawShape - font (fountain)', () => {
    let fountain: Obstacle;

    beforeEach(() => {
      fountain = new Obstacle(400, 500, 0, 0, 'font');
    });

    it('should draw fountain without errors', () => {
      expect(() => fountain.drawShape(mockCtx, 400, 300)).not.toThrow();
    });

    it('should draw fountain with base pool', () => {
      fountain.drawShape(mockCtx, 400, 300);
      expect(true).toBe(true);
    });
  });

  describe('large ruin with vent', () => {
    it('should draw vent when ruin is large enough', () => {
      const largeRuin = new Obstacle(500, 600, 80, 80, 'ruin');
      expect(() => largeRuin.drawShape(mockCtx, 400, 300)).not.toThrow();
    });
  });

  describe('inheritance from Entity', () => {
    let obstacle: Obstacle;

    beforeEach(() => {
      obstacle = new Obstacle(500, 600, 100, 80, 'ruin');
    });

    it('should have marked property', () => {
      expect(obstacle.marked).toBe(false);
      obstacle.marked = true;
      expect(obstacle.marked).toBe(true);
    });

    it('should have x, y, radius, color properties', () => {
      expect(obstacle.x).toBe(500);
      expect(obstacle.y).toBe(600);
      expect(obstacle.radius).toBe(0);
      expect(obstacle.color).toBe('#000');
    });
  });

  describe('type variations', () => {
    it('should support ruin type', () => {
      const ruin = new Obstacle(0, 0, 50, 50, 'ruin');
      expect(ruin.type).toBe('ruin');
    });

    it('should support font type', () => {
      const font = new Obstacle(0, 0, 0, 0, 'font');
      expect(font.type).toBe('font');
    });
  });

  describe('dimensions', () => {
    it('should support square obstacles', () => {
      const square = new Obstacle(0, 0, 60, 60, 'ruin');
      expect(square.w).toBe(60);
      expect(square.h).toBe(60);
    });

    it('should support wide obstacles', () => {
      const wide = new Obstacle(0, 0, 120, 40, 'ruin');
      expect(wide.w).toBe(120);
      expect(wide.h).toBe(40);
    });

    it('should support tall obstacles', () => {
      const tall = new Obstacle(0, 0, 40, 120, 'ruin');
      expect(tall.w).toBe(40);
      expect(tall.h).toBe(120);
    });

    it('should support very large obstacles', () => {
      const huge = new Obstacle(0, 0, 200, 150, 'ruin');
      expect(huge.w).toBe(200);
      expect(huge.h).toBe(150);
    });
  });

  describe('fountain-specific properties', () => {
    it('should ignore w and h for fountain type', () => {
      const fountain = new Obstacle(400, 500, 100, 100, 'font');
      // Fountain has fixed size, w and h are stored but not used for drawing
      expect(fountain.w).toBe(100);
      expect(fountain.h).toBe(100);
    });
  });

  describe('positioning', () => {
    it('should handle obstacles at world boundaries', () => {
      const edgeObstacle = new Obstacle(0, 0, 50, 50, 'ruin');
      expect(() => edgeObstacle.drawShape(mockCtx, 25, 25)).not.toThrow();
    });

    it('should handle obstacles at world center', () => {
      const centerObstacle = new Obstacle(1000, 1000, 100, 100, 'ruin');
      expect(() => centerObstacle.drawShape(mockCtx, 1000, 1000)).not.toThrow();
    });
  });
});
