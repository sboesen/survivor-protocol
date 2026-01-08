import { describe, it, expect } from 'vitest';
import { UPGRADES } from '../upgrades';

describe('UPGRADES', () => {
  it('should be defined', () => {
    expect(UPGRADES).toBeDefined();
  });

  describe('weapons', () => {
    it('should have bubble_stream weapon', () => {
      expect(UPGRADES.bubble_stream).toBeDefined();
      expect(UPGRADES.bubble_stream.name).toBe('Bubble Stream');
      expect(UPGRADES.bubble_stream.type).toBe('Weapon');
      expect(UPGRADES.bubble_stream.desc).toBe('Wavy bubbles that float up');
      expect(UPGRADES.bubble_stream.dmg).toBe(12);
      expect(UPGRADES.bubble_stream.cd).toBe(60);
    });

    it('should have frying_pan weapon', () => {
      expect(UPGRADES.frying_pan).toBeDefined();
      expect(UPGRADES.frying_pan.name).toBe('Frying Pan');
      expect(UPGRADES.frying_pan.type).toBe('Weapon');
      expect(UPGRADES.frying_pan.desc).toBe('High arc damage');
      expect(UPGRADES.frying_pan.dmg).toBe(35);
      expect(UPGRADES.frying_pan.cd).toBe(70);
    });

    it('should have thrown_cds weapon', () => {
      expect(UPGRADES.thrown_cds).toBeDefined();
      expect(UPGRADES.thrown_cds.name).toBe('Thrown CDs');
      expect(UPGRADES.thrown_cds.type).toBe('Weapon');
      expect(UPGRADES.thrown_cds.desc).toBe('Shoots facing direction');
      expect(UPGRADES.thrown_cds.dmg).toBe(9);
      expect(UPGRADES.thrown_cds.cd).toBe(25);
    });

    it('should have fireball weapon', () => {
      expect(UPGRADES.fireball).toBeDefined();
      expect(UPGRADES.fireball.name).toBe('Fireball');
      expect(UPGRADES.fireball.type).toBe('Weapon');
      expect(UPGRADES.fireball.desc).toBe('Homing fireball with trail');
      expect(UPGRADES.fireball.dmg).toBe(25);
      expect(UPGRADES.fireball.cd).toBe(133);
    });

    it('should have lighter weapon', () => {
      expect(UPGRADES.lighter).toBeDefined();
      expect(UPGRADES.lighter.name).toBe('Lighter');
      expect(UPGRADES.lighter.type).toBe('Weapon');
      expect(UPGRADES.lighter.desc).toBe('Short-range flame cone');
      expect(UPGRADES.lighter.dmg).toBe(1);
      expect(UPGRADES.lighter.cd).toBe(3);
    });

    it('should have shield_bash weapon', () => {
      expect(UPGRADES.shield_bash).toBeDefined();
      expect(UPGRADES.shield_bash.name).toBe('Shield Bash');
      expect(UPGRADES.shield_bash.type).toBe('Weapon');
      expect(UPGRADES.shield_bash.desc).toBe('Heavy close-range bash');
      expect(UPGRADES.shield_bash.dmg).toBe(25);
      expect(UPGRADES.shield_bash.cd).toBe(25);
    });

    it('should have bow weapon', () => {
      expect(UPGRADES.bow).toBeDefined();
      expect(UPGRADES.bow.name).toBe('Bow');
      expect(UPGRADES.bow.type).toBe('Weapon');
      expect(UPGRADES.bow.desc).toBe('Rapid arrow shots at nearest enemy');
      expect(UPGRADES.bow.dmg).toBe(8);
      expect(UPGRADES.bow.cd).toBe(30);
    });
  });

  describe('items', () => {
    it('should have pierce item', () => {
      expect(UPGRADES.pierce).toBeDefined();
      expect(UPGRADES.pierce.name).toBe('Sharp Edges');
      expect(UPGRADES.pierce.type).toBe('Item');
      expect(UPGRADES.pierce.desc).toBe('Projectiles pierce +1 enemy');
      expect(UPGRADES.pierce.pierce).toBe(1);
    });

    it('should have scope item', () => {
      expect(UPGRADES.scope).toBeDefined();
      expect(UPGRADES.scope.name).toBe('Good Aim');
      expect(UPGRADES.scope.type).toBe('Item');
      expect(UPGRADES.scope.desc).toBe('+15% Crit Chance (3x Dmg)');
      expect(UPGRADES.scope.crit).toBe(15);
    });

    it('should have damage item', () => {
      expect(UPGRADES.damage).toBeDefined();
      expect(UPGRADES.damage.name).toBe('Energy Drink');
      expect(UPGRADES.damage.type).toBe('Item');
      expect(UPGRADES.damage.desc).toBe('+20% Base Damage');
      expect(UPGRADES.damage.damageMult).toBe(0.2);
    });

    it('should have cooldown item', () => {
      expect(UPGRADES.cooldown).toBeDefined();
      expect(UPGRADES.cooldown.name).toBe('Caffeine');
      expect(UPGRADES.cooldown.type).toBe('Item');
      expect(UPGRADES.cooldown.desc).toBe('-10% Weapon Cooldown');
      expect(UPGRADES.cooldown.cooldownMult).toBe(0.1);
    });

    it('should have projectile item', () => {
      expect(UPGRADES.projectile).toBeDefined();
      expect(UPGRADES.projectile.name).toBe('Extra Ammo');
      expect(UPGRADES.projectile.type).toBe('Item');
      expect(UPGRADES.projectile.desc).toBe('+1 Projectile for all weapons');
      expect(UPGRADES.projectile.projectileCount).toBe(1);
    });

    it('should have projectileSpeed item', () => {
      expect(UPGRADES.projectileSpeed).toBeDefined();
      expect(UPGRADES.projectileSpeed.name).toBe('Swift Arrows');
      expect(UPGRADES.projectileSpeed.type).toBe('Item');
      expect(UPGRADES.projectileSpeed.desc).toBe('+20% projectile speed (all weapons)');
    });
  });

  describe('upgrade count', () => {
    it('should have 7 weapons', () => {
      const weapons = Object.values(UPGRADES).filter(u => u.type === 'Weapon');
      expect(weapons.length).toBe(7);
    });

    it('should have 6 items', () => {
      const items = Object.values(UPGRADES).filter(u => u.type === 'Item');
      expect(items.length).toBe(6);
    });

    it('should have 13 total upgrades', () => {
      expect(Object.keys(UPGRADES).length).toBe(13);
    });
  });

  describe('weapon balance', () => {
    it('should have positive damage values', () => {
      Object.values(UPGRADES).filter(u => u.type === 'Weapon').forEach(weapon => {
        expect(weapon.dmg).toBeGreaterThan(0);
      });
    });

    it('should have positive cooldown values', () => {
      Object.values(UPGRADES).filter(u => u.type === 'Weapon').forEach(weapon => {
        expect(weapon.cd).toBeGreaterThan(0);
      });
    });

    it('should have damage per second variation across weapons', () => {
      const weapons = Object.values(UPGRADES).filter(u => u.type === 'Weapon');
      const dpsValues = weapons.map(w => w.dmg! / w.cd!);
      const uniqueDps = new Set(dpsValues.map(d => Math.floor(d * 10) / 10));
      expect(uniqueDps.size).toBeGreaterThan(2);
    });
  });

  describe('upgrade structure', () => {
    it('should have name on all upgrades', () => {
      Object.values(UPGRADES).forEach(upgrade => {
        expect(upgrade.name).toBeDefined();
        expect(typeof upgrade.name).toBe('string');
        expect(upgrade.name.length).toBeGreaterThan(0);
      });
    });

    it('should have type on all upgrades', () => {
      Object.values(UPGRADES).forEach(upgrade => {
        expect(upgrade.type).toBeDefined();
        expect(['Weapon', 'Item']).toContain(upgrade.type);
      });
    });

    it('should have description on all upgrades', () => {
      Object.values(UPGRADES).forEach(upgrade => {
        expect(upgrade.desc).toBeDefined();
        expect(typeof upgrade.desc).toBe('string');
        expect(upgrade.desc.length).toBeGreaterThan(0);
      });
    });

    it('should have dmg property on weapons', () => {
      Object.values(UPGRADES).filter(u => u.type === 'Weapon').forEach(weapon => {
        expect(weapon.dmg).toBeDefined();
        expect(typeof weapon.dmg).toBe('number');
      });
    });

    it('should have cd property on weapons', () => {
      Object.values(UPGRADES).filter(u => u.type === 'Weapon').forEach(weapon => {
        expect(weapon.cd).toBeDefined();
        expect(typeof weapon.cd).toBe('number');
      });
    });
  });

  describe('item effects', () => {
    it('should have pierce property on pierce item', () => {
      expect(UPGRADES.pierce.pierce).toBeDefined();
      expect(typeof UPGRADES.pierce.pierce).toBe('number');
    });

    it('should have crit property on scope item', () => {
      expect(UPGRADES.scope.crit).toBeDefined();
      expect(typeof UPGRADES.scope.crit).toBe('number');
    });

    it('should have damageMult property on damage item', () => {
      expect(UPGRADES.damage.damageMult).toBeDefined();
      expect(typeof UPGRADES.damage.damageMult).toBe('number');
    });

    it('should have cooldownMult property on cooldown item', () => {
      expect(UPGRADES.cooldown.cooldownMult).toBeDefined();
      expect(typeof UPGRADES.cooldown.cooldownMult).toBe('number');
    });

    it('should have projectileCount property on projectile item', () => {
      expect(UPGRADES.projectile.projectileCount).toBeDefined();
      expect(typeof UPGRADES.projectile.projectileCount).toBe('number');
    });

    it('should have projectileSpeed property on projectileSpeed item', () => {
      expect(UPGRADES.projectileSpeed).toBeDefined();
      expect(UPGRADES.projectileSpeed.name).toBe('Swift Arrows');
      expect(UPGRADES.projectileSpeed.type).toBe('Item');
    });
  });

  describe('weapon types variety', () => {
    it('should include fast low-damage weapons', () => {
      // Lighter: 1 dmg, 3 cd
      expect(UPGRADES.lighter.dmg).toBeLessThan(5);
      expect(UPGRADES.lighter.cd).toBeLessThan(10);
    });

    it('should include slow high-damage weapons', () => {
      // Frying Pan: 35 dmg, 70 cd
      expect(UPGRADES.frying_pan.dmg).toBeGreaterThan(20);
      expect(UPGRADES.frying_pan.cd).toBeGreaterThan(50);
    });

    it('should include balanced weapons', () => {
      // Thrown CDs: 9 dmg, 25 cd
      expect(UPGRADES.thrown_cds.dmg).toBeGreaterThan(5);
      expect(UPGRADES.thrown_cds.dmg).toBeLessThan(20);
      expect(UPGRADES.thrown_cds.cd).toBeGreaterThan(15);
      expect(UPGRADES.thrown_cds.cd).toBeLessThan(40);
    });
  });

  describe('item naming', () => {
    it('should have creative item names', () => {
      expect(UPGRADES.pierce.name).toBe('Sharp Edges');
      expect(UPGRADES.scope.name).toBe('Good Aim');
      expect(UPGRADES.damage.name).toBe('Energy Drink');
      expect(UPGRADES.cooldown.name).toBe('Caffeine');
      expect(UPGRADES.projectile.name).toBe('Extra Ammo');
    });
  });

  describe('upgrade keys', () => {
    it('should have matching keys for weapon types', () => {
      const weaponKeys = ['bubble_stream', 'frying_pan', 'thrown_cds', 'fireball', 'lighter', 'shield_bash', 'bow'];
      weaponKeys.forEach(key => {
        expect(UPGRADES[key]).toBeDefined();
      });
    });

    it('should have matching keys for item types', () => {
      const itemKeys = ['pierce', 'scope', 'damage', 'cooldown', 'projectile', 'projectileSpeed'];
      itemKeys.forEach(key => {
        expect(UPGRADES[key]).toBeDefined();
      });
    });
  });
});
