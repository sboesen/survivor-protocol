import { describe, it, expect } from 'vitest';
import {
  isValidParticleType,
  calculateParticleSpawnCount,
  canSpawnParticles,
  MAX_PARTICLES,
  VALID_PARTICLE_TYPES,
} from '../particleSpawning';

describe('particleSpawning', () => {
  describe('isValidParticleType', () => {
    it('should return true for all valid types', () => {
      VALID_PARTICLE_TYPES.forEach(type => {
        expect(isValidParticleType(type)).toBe(true);
      });
    });

    it('should return false for invalid types', () => {
      expect(isValidParticleType('invalid')).toBe(false);
      expect(isValidParticleType('')).toBe(false);
      expect(isValidParticleType('particle')).toBe(false);
    });

    it('should handle case sensitivity', () => {
      expect(isValidParticleType('Water')).toBe(false);
      expect(isValidParticleType('WATER')).toBe(false);
      expect(isValidParticleType('fire')).toBe(true); // lowercase is valid
    });
  });

  describe('calculateParticleSpawnCount', () => {
    it('should return requested count when well under cap', () => {
      expect(calculateParticleSpawnCount(10, 100)).toBe(10);
      expect(calculateParticleSpawnCount(5, 0)).toBe(5);
    });

    it('should return 0 when at cap', () => {
      expect(calculateParticleSpawnCount(10, 2500)).toBe(0);
      expect(calculateParticleSpawnCount(1, 2500)).toBe(0);
    });

    it('should return 0 when over cap', () => {
      expect(calculateParticleSpawnCount(10, 2600)).toBe(0);
    });

    it('should return available count when near cap', () => {
      expect(calculateParticleSpawnCount(100, 2450)).toBe(50); // Only 50 available
      expect(calculateParticleSpawnCount(10, 2495)).toBe(5); // Only 5 available
    });

    it('should handle requested count of 0', () => {
      expect(calculateParticleSpawnCount(0, 0)).toBe(0);
      expect(calculateParticleSpawnCount(0, 1000)).toBe(0);
    });

    it('should use custom maxParticles', () => {
      expect(calculateParticleSpawnCount(10, 5, 10)).toBe(5); // At custom cap
      expect(calculateParticleSpawnCount(10, 0, 10)).toBe(10); // Well under custom cap
    });

    it('should clamp to 0 when negative current count', () => {
      // Shouldn't happen in practice but test edge case
      expect(calculateParticleSpawnCount(10, -1, 100)).toBe(10);
    });

    it('should handle large requested counts', () => {
      expect(calculateParticleSpawnCount(10000, 0)).toBe(2500); // Capped at MAX_PARTICLES
      expect(calculateParticleSpawnCount(10000, 1000, 5000)).toBe(4000); // Capped at custom max
    });
  });

  describe('canSpawnParticles', () => {
    it('should return true when under cap', () => {
      expect(canSpawnParticles(0)).toBe(true);
      expect(canSpawnParticles(100)).toBe(true);
      expect(canSpawnParticles(2499)).toBe(true);
    });

    it('should return false when at cap', () => {
      expect(canSpawnParticles(2500)).toBe(false);
    });

    it('should return false when over cap', () => {
      expect(canSpawnParticles(2501)).toBe(false);
      expect(canSpawnParticles(3000)).toBe(false);
    });

    it('should use custom maxParticles', () => {
      expect(canSpawnParticles(0, 100)).toBe(true);
      expect(canSpawnParticles(99, 100)).toBe(true);
      expect(canSpawnParticles(100, 100)).toBe(false);
      expect(canSpawnParticles(101, 100)).toBe(false);
    });
  });

  describe('MAX_PARTICLES constant', () => {
    it('should be 2500', () => {
      expect(MAX_PARTICLES).toBe(2500);
    });
  });

  describe('VALID_PARTICLE_TYPES constant', () => {
    it('should have 11 types', () => {
      expect(VALID_PARTICLE_TYPES).toHaveLength(11);
    });

    it('should contain expected types', () => {
      expect(VALID_PARTICLE_TYPES).toContain('water');
      expect(VALID_PARTICLE_TYPES).toContain('explosion');
      expect(VALID_PARTICLE_TYPES).toContain('smoke');
      expect(VALID_PARTICLE_TYPES).toContain('blood');
      expect(VALID_PARTICLE_TYPES).toContain('spark');
      expect(VALID_PARTICLE_TYPES).toContain('foam');
      expect(VALID_PARTICLE_TYPES).toContain('ripple');
      expect(VALID_PARTICLE_TYPES).toContain('caustic');
      expect(VALID_PARTICLE_TYPES).toContain('splash');
      expect(VALID_PARTICLE_TYPES).toContain('fire');
      expect(VALID_PARTICLE_TYPES).toContain('gas');
    });
  });
});
