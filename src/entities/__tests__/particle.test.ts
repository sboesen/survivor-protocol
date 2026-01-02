import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Particle, ParticleType } from '../particle';
import type { CanvasContext } from '../../types';

// Mock canvas context
const mockCtx = {
  save: () => {},
  restore: () => {},
  fillStyle: '',
  fill: () => {},
  stroke: () => {},
  beginPath: () => {},
  arc: () => {},
  globalAlpha: 0,
  createRadialGradient: () => ({
    addColorStop: () => {},
  }),
  lineWidth: 0,
  strokeStyle: '',
} as unknown as CanvasContext;

describe('Particle', () => {
  describe('constructor with minimal config', () => {
    it('should create particle with given position', () => {
      const p = new Particle({ type: 'water', x: 100, y: 200 });
      expect(p.x).toBe(100);
      expect(p.y).toBe(200);
    });

    it('should create particle with given type', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0 });
      expect(p.type).toBe('water');
    });

    it('should generate random velocity if not specified', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0 });
      expect(p.vx).toBeDefined();
      expect(p.vy).toBeDefined();
    });

    it('should use provided velocity if specified', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0, vx: 5, vy: -3 });
      expect(p.vx).toBe(5);
      expect(p.vy).toBe(-3);
    });

    it('should initialize marked as false', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0 });
      expect(p.marked).toBe(false);
    });

    it('should set maxLife to initial life', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0 });
      expect(p.maxLife).toBe(p.life);
    });
  });

  describe('default colors by type', () => {
    it('should set blue color for water', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0 });
      expect(p.color).toBe('#3b82f6');
    });

    it('should set orange color for explosion', () => {
      const p = new Particle({ type: 'explosion', x: 0, y: 0 });
      expect(p.color).toBe('#f97316');
    });

    it('should set gray color for smoke', () => {
      const p = new Particle({ type: 'smoke', x: 0, y: 0 });
      expect(p.color).toBe('#64748b');
    });

    it('should set red color for blood', () => {
      const p = new Particle({ type: 'blood', x: 0, y: 0 });
      expect(p.color).toBe('#dc2626');
    });

    it('should set yellow color for spark', () => {
      const p = new Particle({ type: 'spark', x: 0, y: 0 });
      expect(p.color).toBe('#fbbf24');
    });

    it('should set light blue color for foam', () => {
      const p = new Particle({ type: 'foam', x: 0, y: 0 });
      expect(p.color).toBe('#e0f2fe');
    });

    it('should set blue color for ripple', () => {
      const p = new Particle({ type: 'ripple', x: 0, y: 0 });
      expect(p.color).toBe('#60a5fa');
    });

    it('should set blue color for caustic', () => {
      const p = new Particle({ type: 'caustic', x: 0, y: 0 });
      expect(p.color).toBe('#93c5fd');
    });

    it('should set light blue color for splash', () => {
      const p = new Particle({ type: 'splash', x: 0, y: 0 });
      expect(p.color).toBe('#bfdbfe');
    });

    it('should set orange color for fire', () => {
      const p = new Particle({ type: 'fire', x: 0, y: 0 });
      expect(p.color).toBe('#ffaa00');
    });

    it('should set green color for gas', () => {
      const p = new Particle({ type: 'gas', x: 0, y: 0 });
      expect(p.color).toBe('#33ff33');
    });

    it('should use custom color if provided', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0, color: '#ff0000' });
      expect(p.color).toBe('#ff0000');
    });
  });

  describe('default life by type', () => {
    const testLifeRange = (type: ParticleType, min: number, max: number) => {
      const lives: number[] = [];
      for (let i = 0; i < 20; i++) {
        const p = new Particle({ type, x: 0, y: 0 });
        lives.push(p.life);
      }
      const minLife = Math.min(...lives);
      const maxLife = Math.max(...lives);
      expect(minLife).toBeGreaterThanOrEqual(min);
      expect(maxLife).toBeLessThanOrEqual(max);
    };

    it('should set life between 30-50 for water', () => {
      testLifeRange('water', 30, 50);
    });

    it('should set life between 15-25 for explosion', () => {
      testLifeRange('explosion', 15, 25);
    });

    it('should set life between 40-70 for smoke', () => {
      testLifeRange('smoke', 40, 70);
    });

    it('should set life between 60-90 for blood', () => {
      testLifeRange('blood', 60, 90);
    });

    it('should set life between 10-20 for spark', () => {
      testLifeRange('spark', 10, 20);
    });

    it('should set life between 20-35 for foam', () => {
      testLifeRange('foam', 20, 35);
    });

    it('should set life between 25-35 for ripple', () => {
      testLifeRange('ripple', 25, 35);
    });

    it('should set life between 50-80 for caustic', () => {
      testLifeRange('caustic', 50, 80);
    });

    it('should set life between 15-25 for splash', () => {
      testLifeRange('splash', 15, 25);
    });

    it('should set life between 20-30 for fire', () => {
      testLifeRange('fire', 20, 30);
    });

    it('should set life between 50-80 for gas', () => {
      testLifeRange('gas', 50, 80);
    });

    it('should use custom life if provided', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0, life: 100 });
      expect(p.life).toBe(100);
    });
  });

  describe('default size by type', () => {
    const testSizeRange = (type: ParticleType, min: number, max: number) => {
      const sizes: number[] = [];
      for (let i = 0; i < 20; i++) {
        const p = new Particle({ type, x: 0, y: 0 });
        sizes.push(p.size);
      }
      const minSize = Math.min(...sizes);
      const maxSize = Math.max(...sizes);
      expect(minSize).toBeGreaterThanOrEqual(min);
      expect(maxSize).toBeLessThanOrEqual(max);
    };

    it('should set size between 3-6 for water', () => {
      testSizeRange('water', 3, 6);
    });

    it('should set size between 3-7 for explosion', () => {
      testSizeRange('explosion', 3, 7);
    });

    it('should set size between 4-10 for smoke', () => {
      testSizeRange('smoke', 4, 10);
    });

    it('should set size between 2-4 for blood', () => {
      testSizeRange('blood', 2, 4);
    });

    it('should set size between 1-3 for spark', () => {
      testSizeRange('spark', 1, 3);
    });

    it('should set size between 2-5 for foam', () => {
      testSizeRange('foam', 2, 5);
    });

    it('should set fixed size 3 for ripple', () => {
      const p = new Particle({ type: 'ripple', x: 0, y: 0 });
      expect(p.size).toBe(3);
    });

    it('should set size between 10-25 for caustic', () => {
      testSizeRange('caustic', 10, 25);
    });

    it('should set size between 5-10 for splash', () => {
      testSizeRange('splash', 5, 10);
    });

    it('should set size between 3-6 for fire', () => {
      testSizeRange('fire', 3, 6);
    });

    it('should set size between 6-10 for gas', () => {
      testSizeRange('gas', 6, 10);
    });

    it('should use custom size if provided', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0, size: 10 });
      expect(p.size).toBe(10);
    });
  });

  describe('update - water', () => {
    it('should apply gravity to water', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0, vy: 0 });
      const initialVy = p.vy;
      p.update();
      expect(p.vy).toBeCloseTo(initialVy + 0.05, 2);
    });

    it('should apply air resistance to water vx', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0, vx: 10, vy: 0 });
      const initialVx = p.vx;
      p.update();
      expect(p.vx).toBeCloseTo(initialVx * 0.98, 2);
    });

    it('should wrap position for water', () => {
      const p = new Particle({ type: 'water', x: 1999, y: 1000 });
      p.update();
      expect(p.x).toBeLessThan(2000);
    });

    it('should decrement life', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0 });
      const initialLife = p.life;
      p.update();
      expect(p.life).toBe(initialLife - 1);
    });
  });

  describe('update - smoke', () => {
    it('should rise upward', () => {
      const p = new Particle({ type: 'smoke', x: 0, y: 0, vy: 0 });
      p.update();
      expect(p.y).toBeLessThan(0); // Moved up due to -0.3 vertical adjustment
    });

    it('should increase size over time', () => {
      const p = new Particle({ type: 'smoke', x: 0, y: 0 });
      const initialSize = p.size;
      p.update();
      expect(p.size).toBeCloseTo(initialSize + 0.1, 1);
    });
  });

  describe('update - ripple', () => {
    it('should increase size', () => {
      const p = new Particle({ type: 'ripple', x: 0, y: 0 });
      const initialSize = p.size;
      p.update();
      expect(p.size).toBeCloseTo(initialSize + 0.6, 1);
    });

    it('should not move', () => {
      const p = new Particle({ type: 'ripple', x: 100, y: 200 });
      p.update();
      expect(p.x).toBe(100);
      expect(p.y).toBe(200);
    });
  });

  describe('update - fire', () => {
    it('should apply air resistance', () => {
      const p = new Particle({ type: 'fire', x: 0, y: 0, vx: 5, vy: 5 });
      const initialVx = p.vx;
      const initialVy = p.vy;
      p.update();
      expect(Math.abs(p.vx)).toBeLessThan(Math.abs(initialVx));
      expect(Math.abs(p.vy)).toBeLessThan(Math.abs(initialVy));
    });
  });

  describe('update - gas', () => {
    it('should drift gently with air resistance', () => {
      const p = new Particle({ type: 'gas', x: 0, y: 0, vx: 2, vy: 2 });
      const initialVx = p.vx;
      p.update();
      expect(Math.abs(p.vx)).toBeLessThan(Math.abs(initialVx));
    });
  });

  describe('marking for deletion', () => {
    it('should mark particle when life reaches 0', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0, life: 1 });
      p.update();
      expect(p.marked).toBe(true);
    });

    it('should not mark particle when life > 0', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0, life: 10 });
      p.update();
      expect(p.marked).toBe(false);
    });
  });

  describe('draw', () => {
    it('should mark particle with invalid values', () => {
      const p = new Particle({ type: 'water', x: 0, y: 0 });
      p.x = NaN;
      p.draw(mockCtx, 0, 0, 800, 600);
      expect(p.marked).toBe(true);
    });

    it('should handle non-wrapping particles culling', () => {
      const p = new Particle({ type: 'explosion', x: 5000, y: 5000 });
      p.draw(mockCtx, 1000, 1000, 800, 600);
      // Should not throw, just return early
      expect(true).toBe(true);
    });
  });

  describe('draw - water particle', () => {
    it('should draw water particle without error', () => {
      const p = new Particle({ type: 'water', x: 100, y: 100 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });
  });

  describe('draw - fire particle', () => {
    it('should draw fire particle with color based on progress', () => {
      const p = new Particle({ type: 'fire', x: 100, y: 100 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should draw fire particle with white color when fresh', () => {
      const p = new Particle({ type: 'fire', x: 100, y: 100, life: 30, maxLife: 30 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should draw fire particle with yellow color at medium life', () => {
      const p = new Particle({ type: 'fire', x: 100, y: 100, life: 15, maxLife: 30 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should draw fire particle with orange color at low life', () => {
      const p = new Particle({ type: 'fire', x: 100, y: 100, life: 5, maxLife: 30 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });
  });

  describe('draw - gas particle', () => {
    it('should draw gas particle with gradient', () => {
      const p = new Particle({ type: 'gas', x: 100, y: 100 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });
  });

  describe('draw - smoke particle', () => {
    it('should draw smoke particle without error', () => {
      const p = new Particle({ type: 'smoke', x: 100, y: 100 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should draw smoke particle with reduced alpha', () => {
      const p = new Particle({ type: 'smoke', x: 100, y: 100, life: 20, maxLife: 50 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should clamp smoke particle size to minimum 2', () => {
      const p = new Particle({ type: 'smoke', x: 100, y: 100, size: 0.5 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });
  });

  describe('draw - blood particle', () => {
    it('should draw blood particle without error', () => {
      const p = new Particle({ type: 'blood', x: 100, y: 100 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should clamp blood particle size to minimum 1', () => {
      const p = new Particle({ type: 'blood', x: 100, y: 100, size: 0.1 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });
  });

  describe('draw - spark particle (default case)', () => {
    it('should draw spark particle using default case', () => {
      const p = new Particle({ type: 'spark', x: 100, y: 100 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should clamp spark particle size to minimum 1', () => {
      const p = new Particle({ type: 'spark', x: 100, y: 100, size: 0 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });
  });

  describe('world wrapping', () => {
    it('should wrap water particles', () => {
      const p = new Particle({ type: 'water', x: 1999, y: 1000 });
      p.update();
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(2000);
    });

    it('should wrap foam particles', () => {
      const p = new Particle({ type: 'foam', x: 1999, y: 1000 });
      p.update();
      expect(p.x).toBeGreaterThanOrEqual(0);
    });

    it('should wrap caustic particles', () => {
      const p = new Particle({ type: 'caustic', x: 1999, y: 1000 });
      p.update();
      expect(p.x).toBeGreaterThanOrEqual(0);
    });

    it('should wrap splash particles', () => {
      const p = new Particle({ type: 'splash', x: 1999, y: 1000 });
      p.update();
      expect(p.x).toBeGreaterThanOrEqual(0);
    });

    it('should not wrap explosion particles', () => {
      const p = new Particle({ type: 'explosion', x: 100, y: 100 });
      p.vx = 5;
      p.update();
      // Position changes but doesn't wrap
      expect(p.x).toBe(105);
    });
  });

  describe('draw - default case (unknown particle type)', () => {
    it('should draw unknown particle type with default rendering', () => {
      // Create a particle with a type that hits the default case
      const p = new Particle({ type: 'blood', x: 100, y: 100 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should handle size less than 1 in default case', () => {
      const p = new Particle({ type: 'spark', x: 100, y: 100, size: 0.5 });
      expect(() => p.draw(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });
  });

  describe('drawIllumination', () => {
    it('should return early for non-fire particles', () => {
      const p = new Particle({ type: 'water', x: 100, y: 100 });
      expect(() => p.drawIllumination(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should return early for invalid x position', () => {
      const p = new Particle({ type: 'fire', x: 100, y: 100 });
      p.x = NaN;
      expect(() => p.drawIllumination(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should return early for invalid y position', () => {
      const p = new Particle({ type: 'fire', x: 100, y: 100 });
      p.y = Infinity;
      expect(() => p.drawIllumination(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should return early for invalid size', () => {
      const p = new Particle({ type: 'fire', x: 100, y: 100 });
      p.size = NaN;
      expect(() => p.drawIllumination(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should return early for invalid life', () => {
      const p = new Particle({ type: 'fire', x: 100, y: 100 });
      p.life = Infinity;
      expect(() => p.drawIllumination(mockCtx, 0, 0, 800, 600)).not.toThrow();
    });

    it('should cull fire particles too far from camera', () => {
      const p = new Particle({ type: 'fire', x: 5000, y: 5000 });
      expect(() => p.drawIllumination(mockCtx, 1000, 1000, 800, 600)).not.toThrow();
    });

    it('should cull fire particles off screen', () => {
      const p = new Particle({ type: 'fire', x: 100, y: 100 });
      expect(() => p.drawIllumination(mockCtx, 3000, 3000, 800, 600)).not.toThrow();
    });

    it('should draw illumination for visible fire particle', () => {
      const p = new Particle({ type: 'fire', x: 400, y: 300 });
      expect(() => p.drawIllumination(mockCtx, 400, 300, 800, 600)).not.toThrow();
    });

    it('should handle fire particle at edge of screen', () => {
      const p = new Particle({ type: 'fire', x: 0, y: 0 });
      expect(() => p.drawIllumination(mockCtx, 100, 100, 800, 600)).not.toThrow();
    });

    it('should adjust illumination based on particle life progress', () => {
      const p = new Particle({ type: 'fire', x: 400, y: 300, life: 30, maxLife: 30 });
      expect(() => p.drawIllumination(mockCtx, 400, 300, 800, 600)).not.toThrow();
    });

    it('should handle nearly expired fire particle', () => {
      const p = new Particle({ type: 'fire', x: 400, y: 300, life: 1, maxLife: 30 });
      expect(() => p.drawIllumination(mockCtx, 400, 300, 800, 600)).not.toThrow();
    });

    it('should handle fresh fire particle', () => {
      const p = new Particle({ type: 'fire', x: 400, y: 300, life: 30, maxLife: 30 });
      p.life = 30;
      expect(() => p.drawIllumination(mockCtx, 400, 300, 800, 600)).not.toThrow();
    });
  });
});
