import { describe, it, expect } from 'vitest';
import {
  hasDamageImmunity,
  calculateRebootHeal,
  getUltConfig,
  calculateGreaseFireProjectiles,
  getTimeFreezeDuration,
  type GreaseFireProjectile,
} from '../ultimates';

describe('ultimates', () => {
  describe('hasDamageImmunity', () => {
    it('should return true for Security ult when active', () => {
      expect(hasDamageImmunity('Security', 300)).toBe(true);
      expect(hasDamageImmunity('Security', 1)).toBe(true);
    });

    it('should return true for Reboot ult when active', () => {
      expect(hasDamageImmunity('Reboot', 300)).toBe(true);
      expect(hasDamageImmunity('Reboot', 1)).toBe(true);
    });

    it('should return false for Security when not active', () => {
      expect(hasDamageImmunity('Security', 0)).toBe(false);
    });

    it('should return false for Reboot when not active', () => {
      expect(hasDamageImmunity('Reboot', 0)).toBe(false);
    });

    it('should return false for other ults', () => {
      expect(hasDamageImmunity('Ollie', 300)).toBe(false);
      expect(hasDamageImmunity('ClosingTime', 240)).toBe(false);
      expect(hasDamageImmunity('GreaseFire', 100)).toBe(false);
    });

    it('should return false for unknown ults', () => {
      expect(hasDamageImmunity('Unknown', 300)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasDamageImmunity('', 300)).toBe(false);
    });
  });

  describe('calculateRebootHeal', () => {
    it('should heal for 50% of max HP when at full health', () => {
      const result = calculateRebootHeal(100, 100);
      expect(result).toBe(100); // Already at max
    });

    it('should heal for 50% of max HP when at half health', () => {
      const result = calculateRebootHeal(50, 100);
      expect(result).toBe(100); // 50 + 50 = max
    });

    it('should heal for 50% of max HP when at low health', () => {
      const result = calculateRebootHeal(20, 100);
      expect(result).toBe(70); // 20 + 50 = 70
    });

    it('should heal for 50% of max HP when at 1 HP', () => {
      const result = calculateRebootHeal(1, 100);
      expect(result).toBe(51); // 1 + 50 = 51
    });

    it('should cap at max HP', () => {
      const result = calculateRebootHeal(80, 100);
      expect(result).toBe(100); // 80 + 50 would be 130, capped at 100
    });

    it('should handle different max HP values', () => {
      expect(calculateRebootHeal(50, 200)).toBe(150); // 50 + 100
      expect(calculateRebootHeal(100, 200)).toBe(200); // 100 + 100 = max
    });

    it('should handle fractional HP', () => {
      const result = calculateRebootHeal(45.5, 100);
      expect(result).toBeCloseTo(95.5, 1);
    });

    it('should return max HP when already at max', () => {
      const result = calculateRebootHeal(100, 100);
      expect(result).toBe(100);
    });

    it('should handle zero current HP', () => {
      const result = calculateRebootHeal(0, 100);
      expect(result).toBe(50); // 0 + 50
    });
  });

  describe('getUltConfig', () => {
    it('should return config for Security', () => {
      const result = getUltConfig('Security');
      expect(result).toEqual({ duration: 300, text: 'SECURITY!', color: '#4af' });
    });

    it('should return config for Ollie', () => {
      const result = getUltConfig('Ollie');
      expect(result).toEqual({ duration: 300, text: 'OLLIE!', color: '#0f0' });
    });

    it('should return config for ClosingTime', () => {
      const result = getUltConfig('ClosingTime');
      expect(result).toEqual({ duration: 240, text: 'CLOSED!', color: '#888' });
    });

    it('should return config for GreaseFire', () => {
      const result = getUltConfig('GreaseFire');
      expect(result).toEqual({ duration: 0, text: 'GREASE FIRE!', color: '#f80' });
    });

    it('should return config for Reboot', () => {
      const result = getUltConfig('Reboot');
      expect(result).toEqual({ duration: 300, text: 'REBOOT!', color: '#0ff' });
    });

    it('should return null for unknown ult', () => {
      const result = getUltConfig('UnknownUlt');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = getUltConfig('');
      expect(result).toBeNull();
    });
  });

  describe('calculateGreaseFireProjectiles', () => {
    it('should create 12 projectiles', () => {
      const result = calculateGreaseFireProjectiles(100, 100);
      expect(result).toHaveLength(12);
    });

    it('should create projectiles with correct damage', () => {
      const result = calculateGreaseFireProjectiles(100, 100);
      result.forEach(proj => {
        expect(proj.damage).toBe(20);
      });
    });

    it('should create projectiles with correct color', () => {
      const result = calculateGreaseFireProjectiles(100, 100);
      result.forEach(proj => {
        expect(proj.color).toBe('#f80');
      });
    });

    it('should create projectiles with high pierce', () => {
      const result = calculateGreaseFireProjectiles(100, 100);
      result.forEach(proj => {
        expect(proj.pierce).toBe(999);
      });
    });

    it('should create arc projectiles', () => {
      const result = calculateGreaseFireProjectiles(100, 100);
      result.forEach(proj => {
        expect(proj.isArc).toBe(true);
      });
    });

    it('should spread projectiles in a circle', () => {
      const result = calculateGreaseFireProjectiles(0, 0);
      // Check that angles are evenly distributed
      expect(result[0].angle).toBeCloseTo(0, 5);
      expect(result[1].angle).toBeCloseTo(Math.PI / 6, 5);
      expect(result[2].angle).toBeCloseTo(Math.PI / 3, 5);
      expect(result[3].angle).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should calculate correct velocity for each angle', () => {
      const result = calculateGreaseFireProjectiles(0, 0);
      // First projectile (angle 0) should move right at speed 5
      expect(result[0].vx).toBeCloseTo(5, 5);
      expect(result[0].vy).toBeCloseTo(0, 5);
      // Fourth projectile (angle 90deg) should move down at speed 5
      expect(result[3].vx).toBeCloseTo(0, 5);
      expect(result[3].vy).toBeCloseTo(5, 5);
    });

    it('should have consistent duration for all projectiles', () => {
      const result = calculateGreaseFireProjectiles(100, 100);
      result.forEach(proj => {
        expect(proj.duration).toBe(100);
      });
    });
  });

  describe('getTimeFreezeDuration', () => {
    it('should return 240 frames', () => {
      expect(getTimeFreezeDuration()).toBe(240);
    });
  });

  describe('edge cases', () => {
    it('should handle negative ult active time', () => {
      expect(hasDamageImmunity('Security', -1)).toBe(false);
      expect(hasDamageImmunity('Reboot', -10)).toBe(false);
    });

    it('should handle zero max HP for reboot heal', () => {
      const result = calculateRebootHeal(0, 0);
      expect(result).toBe(0);
    });

    it('should handle negative HP gracefully for reboot heal', () => {
      const result = calculateRebootHeal(-10, 100);
      expect(result).toBe(40); // -10 + 50 = 40
    });
  });
});
