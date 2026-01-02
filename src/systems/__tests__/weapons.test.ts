import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fireNearest,
  fireBubble,
  fireFacing,
  fireArc,
  fireFireball,
  fireSpray,
  checkAura,
  fireWeapon,
  calculateWeaponDamage,
  decrementCooldown,
  type WeaponFireResult,
} from '../weapons';
import type { Weapon } from '../../types';

// Mock targeting module
vi.mock('../../targeting', () => ({
  calculateWrappedAngle: vi.fn((x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1)),
  findNearestEnemy: vi.fn((enemies, x, y, maxDist) => {
    if (enemies.length === 0) return { enemy: null, distance: maxDist };
    return { enemy: enemies[0], distance: 100 };
  }),
}));

// Mock Enemy class
class MockEnemy {
  constructor(public x: number, public y: number, public id: number) {}
}

const createWeapon = (overrides: Partial<Weapon> = {}): Weapon => ({
  id: 'pepper_spray' as any,
  cd: 30,
  dmg: 10,
  type: 'nearest',
  curCd: 0,
  level: 1,
  baseDmg: 10,
  ...overrides,
});

const createPlayer = (x = 100, y = 100) => ({ x, y });

describe('weapons', () => {
  describe('fireNearest', () => {
    it('should not fire when no enemies', () => {
      const result = fireNearest(createPlayer(), [], 10, false, 1);
      expect(result.fired).toBe(false);
    });

    it('should fire projectile at nearest enemy', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const result = fireNearest(createPlayer(), enemies, 10, false, 1);

      expect(result.fired).toBe(true);
      expect(result.projectiles).toHaveLength(1);
      expect(result.projectiles![0].vx).toBeCloseTo(8, 1);
      expect(result.projectiles![0].vy).toBe(0);
      expect(result.projectiles![0].dmg).toBe(10);
      expect(result.projectiles![0].color).toBe('#0ff');
    });

    it('should apply crit damage', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const result = fireNearest(createPlayer(), enemies, 30, true, 1); // dmg is already multiplied by caller

      expect(result.projectiles![0].dmg).toBe(30); // 3x for crit (applied by caller)
      expect(result.projectiles![0].isCrit).toBe(true);
    });

    it('should apply pierce from items', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const result = fireNearest(createPlayer(), enemies, 10, false, 3);

      expect(result.projectiles![0].pierce).toBe(3);
    });
  });

  describe('fireBubble', () => {
    it('should not fire when no enemies', () => {
      const w = createWeapon({ type: 'bubble' });
      const result = fireBubble(createPlayer(), [], w, 10, false, 1);
      expect(result.fired).toBe(false);
    });

    it('should fire single bubble projectile', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'bubble' });
      const result = fireBubble(createPlayer(), enemies, w, 12, false, 1);

      expect(result.fired).toBe(true);
      expect(result.projectiles).toHaveLength(1);
      expect(result.projectiles![0].color).toBe('#aaddff');
      expect(result.projectiles![0].isBubble).toBe(true);
      expect(result.projectiles![0].splits).toBeUndefined();
    });

    it('should fire multiple bubbles with projectileCount', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'bubble', projectileCount: 2 });
      const result = fireBubble(createPlayer(), enemies, w, 12, false, 1);

      expect(result.projectiles).toHaveLength(2);
    });

    it('should apply speed multiplier', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'bubble', speedMult: 2 });
      const result = fireBubble(createPlayer(), enemies, w, 12, false, 1);

      // Speed should be 3.5 * 2 = 7
      const speed = Math.hypot(result.projectiles![0].vx, result.projectiles![0].vy);
      expect(speed).toBeCloseTo(7, 1);
    });

    it('should set splits flag when weapon has splits', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'bubble', splits: true });
      const result = fireBubble(createPlayer(), enemies, w, 12, false, 1);

      expect(result.projectiles![0].splits).toBe(true);
    });
  });

  describe('fireFacing', () => {
    it('should use aimAngle when provided', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5); // Center of spread
      const w = createWeapon({ type: 'facing' });
      const result = fireFacing(createPlayer(), undefined, undefined, Math.PI / 4, w, 10, false, 1);

      expect(result.fired).toBe(true);
      expect(result.projectiles).toHaveLength(1);
      // Speed 10, angle PI/4, so vx and vy should both be 10/sqrt(2) ≈ 7.07
      expect(result.projectiles![0].vx).toBeCloseTo(7.07, 1);
      expect(result.projectiles![0].vy).toBeCloseTo(7.07, 1);
      mockRandom.mockRestore();
    });

    it('should fallback to lastDx/lastDy when no aimAngle', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const w = createWeapon({ type: 'facing' });
      const result = fireFacing(createPlayer(), 1, 0, undefined, w, 10, false, 1);

      expect(result.projectiles![0].vx).toBeCloseTo(10, 1);
      expect(result.projectiles![0].vy).toBeCloseTo(0, 1);
      mockRandom.mockRestore();
    });

    it('should default to right when no direction info', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const w = createWeapon({ type: 'facing' });
      const result = fireFacing(createPlayer(), undefined, undefined, undefined, w, 10, false, 1);

      expect(result.projectiles![0].vx).toBeCloseTo(10, 1);
      expect(result.projectiles![0].vy).toBeCloseTo(0, 1);
      mockRandom.mockRestore();
    });

    it('should add extra pierce', () => {
      const w = createWeapon({ type: 'facing' });
      const result = fireFacing(createPlayer(), 1, 0, undefined, w, 10, false, 2);

      // pierce + 1 = 2 + 1 = 3
      expect(result.projectiles![0].pierce).toBe(3);
    });

    it('should apply speed multiplier', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const w = createWeapon({ type: 'facing', speedMult: 1.5 });
      const result = fireFacing(createPlayer(), 1, 0, undefined, w, 10, false, 1);

      expect(result.projectiles![0].vx).toBeCloseTo(15, 0);
      mockRandom.mockRestore();
    });

    it('should fire multiple projectiles with spread', () => {
      const w = createWeapon({ type: 'facing', projectileCount: 3 });
      const result = fireFacing(createPlayer(), 1, 0, undefined, w, 10, false, 1);

      expect(result.projectiles).toHaveLength(3);
    });
  });

  describe('fireArc', () => {
    it('should fire arc projectiles upward', () => {
      const w = createWeapon({ type: 'arc' });
      const result = fireArc(createPlayer(), w, 35, false, 1);

      expect(result.fired).toBe(true);
      expect(result.projectiles).toHaveLength(1);
      expect(result.projectiles![0].vy).toBe(-10);
      expect(result.projectiles![0].isArc).toBe(true);
      expect(result.projectiles![0].dmg).toBe(70); // 35 * 2
    });

    it('should have random horizontal velocity', () => {
      const w = createWeapon({ type: 'arc' });
      const result = fireArc(createPlayer(), w, 35, false, 1);

      expect(result.projectiles![0].vx).toBeGreaterThanOrEqual(-2);
      expect(result.projectiles![0].vx).toBeLessThanOrEqual(2);
    });

    it('should use custom size', () => {
      const w = createWeapon({ type: 'arc', size: 15 });
      const result = fireArc(createPlayer(), w, 35, false, 1);

      expect(result.projectiles![0].radius).toBe(15);
    });

    it('should include explodeRadius when set', () => {
      const w = createWeapon({ type: 'arc', explodeRadius: 50 });
      const result = fireArc(createPlayer(), w, 35, false, 1);

      expect(result.projectiles![0].explodeRadius).toBe(50);
    });

    it('should include knockback when set', () => {
      const w = createWeapon({ type: 'arc', knockback: 10 });
      const result = fireArc(createPlayer(), w, 35, false, 1);

      expect(result.projectiles![0].knockback).toBe(10);
    });

    it('should add extra pierce', () => {
      const w = createWeapon({ type: 'arc' });
      const result = fireArc(createPlayer(), w, 35, false, 1);

      expect(result.projectiles![0].pierce).toBe(3); // 1 + 2
    });
  });

  describe('fireFireball', () => {
    it('should not fire when no enemies', () => {
      const w = createWeapon({ type: 'fireball' });
      const result = fireFireball(createPlayer(), [], w, 25, false, 1);

      expect(result.fired).toBe(false);
    });

    it('should fire single fireball', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'fireball' });
      const result = fireFireball(createPlayer(), enemies, w, 25, false, 1);

      expect(result.fired).toBe(true);
      expect(result.fireballs).toHaveLength(1);
      expect(result.fireballs![0].dmg).toBe(25);
      expect(result.fireballs![0].speed).toBe(6);
      expect(result.fireballs![0].duration).toBe(90);
    });

    it('should fire multiple fireballs with spread', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'fireball', projectileCount: 3 });
      const result = fireFireball(createPlayer(), enemies, w, 25, false, 1);

      expect(result.fireballs).toHaveLength(3);
    });

    it('should apply speed multiplier', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'fireball', speedMult: 2 });
      const result = fireFireball(createPlayer(), enemies, w, 25, false, 1);

      expect(result.fireballs![0].speed).toBe(12); // 6 * 2
    });

    it('should include explodeRadius when set', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'fireball', explodeRadius: 50 });
      const result = fireFireball(createPlayer(), enemies, w, 25, false, 1);

      expect(result.fireballs![0].explodeRadius).toBe(50);
    });

    it('should include trailDamage when set', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'fireball', trailDamage: 5 });
      const result = fireFireball(createPlayer(), enemies, w, 25, false, 1);

      expect(result.fireballs![0].trailDamage).toBe(5);
    });
  });

  describe('fireSpray', () => {
    it('should return spray data for pepper_spray', () => {
      const w = createWeapon({ type: 'spray' });
      const result = fireSpray(createPlayer(), 1, 0, undefined, w, 'pepper_spray');

      expect(result.fired).toBe(true);
      expect(result.spray).toBeDefined();
      expect(result.spray!.isLighter).toBe(false);
      expect(result.spray!.gasColor).toBe('#33ff33');
      expect(result.spray!.pelletCount).toBe(5);
    });

    it('should return spray data for lighter', () => {
      const w = createWeapon({ type: 'spray' });
      const result = fireSpray(createPlayer(), 1, 0, undefined, w, 'lighter');

      expect(result.spray!.isLighter).toBe(true);
      expect(result.spray!.gasColor).toBe('#ffcccc');
      expect(result.spray!.pelletCount).toBe(3);
    });

    it('should use aimAngle when provided', () => {
      const w = createWeapon({ type: 'spray' });
      const result = fireSpray(createPlayer(), undefined, undefined, Math.PI / 2, w, 'pepper_spray');

      expect(result.spray!.baseAngle).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should fallback to lastDx/lastDy when no aimAngle', () => {
      const w = createWeapon({ type: 'spray' });
      const result = fireSpray(createPlayer(), 0, 1, undefined, w, 'pepper_spray');

      expect(result.spray!.baseAngle).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should use random angle when no direction info', () => {
      const w = createWeapon({ type: 'spray' });
      const result = fireSpray(createPlayer(), undefined, undefined, undefined, w, 'pepper_spray');

      expect(result.spray!.baseAngle).toBeGreaterThanOrEqual(0);
      expect(result.spray!.baseAngle).toBeLessThanOrEqual(Math.PI * 2);
    });

    it('should use custom spread and coneLength', () => {
      const w = createWeapon({ type: 'spray', spread: 0.5, coneLength: 80 });
      const result = fireSpray(createPlayer(), 1, 0, undefined, w, 'pepper_spray');

      expect(result.spray!.spreadAmount).toBe(0.5);
      expect(result.spray!.coneLength).toBe(80);
    });
  });

  describe('checkAura', () => {
    it('should not fire when weapon has no area', () => {
      const w = createWeapon({ type: 'aura' });
      const result = checkAura(w, 0, 10, false);

      expect(result.fired).toBe(false);
    });

    it('should not fire on non-interval frames', () => {
      const w = createWeapon({ type: 'aura', area: 50 });
      const result = checkAura(w, 5, 10, false);

      expect(result.fired).toBe(false);
    });

    it('should fire every 20 frames', () => {
      const w = createWeapon({ type: 'aura', area: 50 });
      const result = checkAura(w, 20, 10, false);

      expect(result.fired).toBe(true);
      expect(result.auraDamage).toEqual({ dmg: 10, isCrit: false, area: 50 });
    });

    it('should also fire on frame 40, 60, etc', () => {
      const w = createWeapon({ type: 'aura', area: 50 });

      expect(checkAura(w, 40, 10, false).fired).toBe(true);
      expect(checkAura(w, 60, 10, false).fired).toBe(true);
      expect(checkAura(w, 80, 10, false).fired).toBe(true);
    });

    it('should include crit status', () => {
      const w = createWeapon({ type: 'aura', area: 50 });
      const result = checkAura(w, 20, 10, true);

      expect(result.auraDamage!.isCrit).toBe(true);
    });
  });

  describe('calculateWeaponDamage', () => {
    it('should calculate normal damage without crit', () => {
      const result = calculateWeaponDamage(10, 1.5, 0.2, 0.5);

      expect(result.isCrit).toBe(false);
      expect(result.damage).toBe(15); // 10 * 1.5
    });

    it('should calculate crit damage (3x multiplier)', () => {
      const result = calculateWeaponDamage(10, 1.5, 0.2, 0.1);

      expect(result.isCrit).toBe(true);
      expect(result.damage).toBe(45); // 10 * 1.5 * 3
    });

    it('should not crit when random value equals crit chance', () => {
      const result = calculateWeaponDamage(10, 1, 0.2, 0.2);

      expect(result.isCrit).toBe(false);
    });

    it('should crit when random value is less than crit chance', () => {
      const result = calculateWeaponDamage(10, 1, 0.2, 0.199);

      expect(result.isCrit).toBe(true);
    });

    it('should always crit with 100% crit chance', () => {
      const result = calculateWeaponDamage(10, 1, 1, 0.999);

      expect(result.isCrit).toBe(true);
    });

    it('should never crit with 0% crit chance', () => {
      const result = calculateWeaponDamage(10, 1, 0, 0);

      expect(result.isCrit).toBe(false);
    });

    it('should handle fractional damage', () => {
      const result = calculateWeaponDamage(7, 1.3, 0, 0.5);

      expect(result.damage).toBeCloseTo(9.1, 1);
    });

    it('should handle zero base damage', () => {
      const result = calculateWeaponDamage(0, 2, 0.5, 0);

      expect(result.damage).toBe(0);
    });
  });

  describe('decrementCooldown', () => {
    it('should decrement cooldown by 1 with no bonuses', () => {
      const result = decrementCooldown(10, 0, false);

      expect(result).toBe(9);
    });

    it('should decrement cooldown by more with cooldown bonus', () => {
      const result = decrementCooldown(10, 0.5, false);

      expect(result).toBe(8.5); // 10 - (1 + 0.5)
    });

    it('should double decrement when Ollie ult is active', () => {
      const result = decrementCooldown(10, 0, true);

      expect(result).toBe(8); // 10 - (1 * 2)
    });

    it('should combine cooldown bonus with Ollie ult', () => {
      const result = decrementCooldown(10, 0.5, true);

      expect(result).toBe(7); // 10 - ((1 + 0.5) * 2) = 10 - 3
    });

    it('should clamp to zero when fully cooled down', () => {
      const result = decrementCooldown(0.5, 0, false);

      expect(result).toBe(0);
    });

    it('should handle already-zero cooldown', () => {
      const result = decrementCooldown(0, 0, false);

      expect(result).toBe(0);
    });

    it('should handle large cooldown values', () => {
      const result = decrementCooldown(1000, 2, true);

      expect(result).toBe(994); // 1000 - ((1 + 2) * 2) = 1000 - 6
    });
  });

  describe('fireWeapon (main function)', () => {
    const player = createPlayer();
    const enemies = [new MockEnemy(150, 100, 1) as any];
    const weapon = createWeapon();
    const baseDmg = 10;
    const isCrit = false;
    const pierce = 1;

    it('should route to nearest weapon type', () => {
      const result = fireWeapon('nearest', 'pepper_spray', player, enemies, weapon, baseDmg, isCrit, pierce, undefined, undefined, undefined, 0);

      expect(result.fired).toBe(true);
      expect(result.projectiles).toBeDefined();
    });

    it('should route to bubble weapon type', () => {
      const w = createWeapon({ type: 'bubble' });
      const result = fireWeapon('bubble', 'bubble_stream', player, enemies, w, baseDmg, isCrit, pierce, undefined, undefined, undefined, 0);

      expect(result.fired).toBe(true);
      expect(result.projectiles![0].isBubble).toBe(true);
    });

    it('should route to facing weapon type', () => {
      const w = createWeapon({ type: 'facing' });
      const result = fireWeapon('facing', 'thrown_cds', player, enemies, w, baseDmg, isCrit, pierce, 1, 0, undefined, 0);

      expect(result.fired).toBe(true);
      expect(result.projectiles![0].color).toBe('#f00');
    });

    it('should route to arc weapon type', () => {
      const w = createWeapon({ type: 'arc' });
      const result = fireWeapon('arc', 'frying_pan', player, enemies, w, baseDmg, isCrit, pierce, undefined, undefined, undefined, 0);

      expect(result.fired).toBe(true);
      expect(result.projectiles![0].isArc).toBe(true);
    });

    it('should route to fireball weapon type', () => {
      const w = createWeapon({ type: 'fireball' });
      const result = fireWeapon('fireball', 'fireball', player, enemies, w, baseDmg, isCrit, pierce, undefined, undefined, undefined, 0);

      expect(result.fired).toBe(true);
      expect(result.fireballs).toBeDefined();
    });

    it('should route to spray weapon type', () => {
      const w = createWeapon({ type: 'spray' });
      const result = fireWeapon('spray', 'pepper_spray', player, enemies, w, baseDmg, isCrit, pierce, 1, 0, undefined, 0);

      expect(result.fired).toBe(true);
      expect(result.spray).toBeDefined();
    });

    it('should route to aura weapon type', () => {
      const w = createWeapon({ type: 'aura', area: 50 });
      const result = fireWeapon('aura', 'mop_bucket', player, enemies, w, baseDmg, isCrit, pierce, undefined, undefined, undefined, 20);

      expect(result.fired).toBe(true);
      expect(result.auraDamage).toBeDefined();
    });

    it('should return not fired for unknown weapon type', () => {
      const result = fireWeapon('unknown' as any, 'unknown', player, enemies, weapon, baseDmg, isCrit, pierce, undefined, undefined, undefined, 0);

      expect(result.fired).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty enemy list for all projectile weapons', () => {
      const player = createPlayer();
      const w = createWeapon({ type: 'nearest' });

      expect(fireWeapon('nearest', 'pepper_spray', player, [], w, 10, false, 1, undefined, undefined, undefined, 0).fired).toBe(false);
      expect(fireWeapon('bubble', 'bubble_stream', player, [], w, 10, false, 1, undefined, undefined, undefined, 0).fired).toBe(false);
      expect(fireWeapon('fireball', 'fireball', player, [], w, 10, false, 1, undefined, undefined, undefined, 0).fired).toBe(false);
    });

    it('should handle zero pierce', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'nearest' });
      const result = fireNearest(createPlayer(), enemies, 10, false, 0);

      expect(result.projectiles![0].pierce).toBe(0);
    });

    it('should handle very high damage values', () => {
      const enemies = [new MockEnemy(150, 100, 1) as any];
      const w = createWeapon({ type: 'nearest' });
      const result = fireNearest(createPlayer(), enemies, 1000, false, 1);

      expect(result.projectiles![0].dmg).toBe(1000);
    });
  });
});
