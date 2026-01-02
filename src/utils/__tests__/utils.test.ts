import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Utils } from '../../utils';

describe('Utils', () => {
  describe('rand', () => {
    it('should return a number between min and max', () => {
      const result = Utils.rand(5, 10);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should handle negative ranges', () => {
      const result = Utils.rand(-10, -5);
      expect(result).toBeGreaterThanOrEqual(-10);
      expect(result).toBeLessThanOrEqual(-5);
    });

    it('should handle zero range', () => {
      const result = Utils.rand(5, 5);
      expect(result).toBe(5);
    });

    it('should handle inverted min/max', () => {
      const result = Utils.rand(10, 5);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should produce different values on multiple calls', () => {
      const results = new Set();
      for (let i = 0; i < 100; i++) {
        results.add(Utils.rand(0, 100));
      }
      expect(results.size).toBeGreaterThan(50);
    });
  });

  describe('getDist', () => {
    const worldSize = 2000;

    it('should calculate Euclidean distance for nearby points', () => {
      const dist = Utils.getDist(0, 0, 3, 4);
      expect(dist).toBe(5);
    });

    it('should calculate Euclidean distance for any points', () => {
      const dist = Utils.getDist(100, 100, 150, 200);
      expect(dist).toBeCloseTo(111.803, 2);
    });

    it('should handle world wrapping for x coordinate', () => {
      // Point at (100, 0) and point at (1900, 0) should be close due to wrapping
      // dx = 1900 - 100 = 1800, which is > 1000, so dx = 2000 - 1800 = 200
      const dist = Utils.getDist(100, 0, 1900, 0);
      expect(dist).toBe(200);
    });

    it('should handle world wrapping for y coordinate', () => {
      const dist = Utils.getDist(0, 100, 0, 1900);
      expect(dist).toBe(200);
    });

    it('should handle world wrapping for both coordinates', () => {
      const dist = Utils.getDist(100, 100, 1900, 1900);
      expect(dist).toBeCloseTo(282.84, 1);
    });

    it('should return zero for same point', () => {
      const dist = Utils.getDist(500, 500, 500, 500);
      expect(dist).toBe(0);
    });

    it('should handle distance across world edge', () => {
      // Distance from worldSize - 10 to 10 should be 20 (wrapping)
      const dist = Utils.getDist(worldSize - 10, 1000, 10, 1000);
      expect(dist).toBe(20);
    });

    it('should use shortest path across wrapped world', () => {
      // Distance from 100 to 1500: direct path is 1400, wrapped path is 600
      const dist = Utils.getDist(100, 1000, 1500, 1000);
      expect(dist).toBeLessThan(800);
    });
  });

  describe('fmtTime', () => {
    it('should format seconds under 1 minute', () => {
      expect(Utils.fmtTime(0)).toBe('00:00');
      expect(Utils.fmtTime(5)).toBe('00:05');
      expect(Utils.fmtTime(30)).toBe('00:30');
      expect(Utils.fmtTime(59)).toBe('00:59');
    });

    it('should format minutes and seconds', () => {
      expect(Utils.fmtTime(60)).toBe('01:00');
      expect(Utils.fmtTime(65)).toBe('01:05');
      expect(Utils.fmtTime(90)).toBe('01:30');
      expect(Utils.fmtTime(125)).toBe('02:05');
    });

    it('should handle larger time values', () => {
      expect(Utils.fmtTime(3600)).toBe('60:00');
      expect(Utils.fmtTime(3661)).toBe('61:01');
      expect(Utils.fmtTime(7265)).toBe('121:05');
    });

    it('should pad single digit minutes and seconds', () => {
      expect(Utils.fmtTime(5)).toBe('00:05');
      expect(Utils.fmtTime(65)).toBe('01:05');
      expect(Utils.fmtTime(305)).toBe('05:05');
    });

    it('should handle edge cases', () => {
      expect(Utils.fmtTime(0)).toBe('00:00');
      expect(Utils.fmtTime(1)).toBe('00:01');
      expect(Utils.fmtTime(59)).toBe('00:59');
      expect(Utils.fmtTime(60)).toBe('01:00');
      expect(Utils.fmtTime(61)).toBe('01:01');
    });
  });
});
