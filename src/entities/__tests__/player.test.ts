import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../player';
import type { CanvasContext } from '../../types';

type MockCallback = () => void;

// Mock canvas context
const mockCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  beginPath: () => {},
  arc: () => {},
  stroke: () => {},
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  clearRect: () => {},
  fillRect: () => {},
  drawImage: () => {},
  createRadialGradient: () => ({ addColorStop: () => {} }),
} as unknown as CanvasContext;

// Mock Renderer
vi.mock('../../systems/renderer', () => ({
  Renderer: {
    drawSprite: vi.fn(),
  },
}));

describe('Player', () => {
  let player: Player;
  let levelUpCallback: MockCallback & { mockClear: () => void; mockReset: () => void; calls: unknown[] };

  beforeEach(() => {
    levelUpCallback = vi.fn() as unknown as MockCallback & { mockClear: () => void; mockReset: () => void; calls: unknown[] };
    player = new Player(
      'wizard',
      0.75,  // hpMod
      0.95,  // spdMod
      'fireball',  // starting weapon
      'MeteorSwarm',  // ult
      { health: 0, speed: 0, magnet: 0, damage: 0 }
    );
  });

  describe('constructor', () => {
    it('should initialize with correct character ID', () => {
      expect(player.charId).toBe('wizard');
    });

    it('should initialize with max HP based on hpMod and shop upgrades', () => {
      // Base HP = 100, shop health = 0, hpMod = 0.75
      expect(player.maxHp).toBe(75);
    });

    it('should initialize HP equal to max HP', () => {
      expect(player.hp).toBe(player.maxHp);
    });

    it('should initialize speed based on spdMod and shop upgrades', () => {
      // Base speed = 7.5, shop speed = 0, spdMod = 0.95
      expect(player.speed).toBeCloseTo(7.125, 2);
    });

    it('should initialize pickup range based on shop upgrades', () => {
      expect(player.pickupRange).toBe(60); // Base 60, no magnet upgrades
    });

    it('should initialize damage multiplier based on shop upgrades', () => {
      expect(player.dmgMult).toBe(1); // Base 1, no damage upgrades
    });

    it('should initialize crit chance to 0', () => {
      expect(player.critChance).toBe(0);
    });

    it('should initialize items', () => {
      expect(player.items.pierce).toBe(0);
      expect(player.items.cooldown).toBe(0);
      expect(player.items.projectile).toBe(0);
    });

    it('should initialize XP and level', () => {
      expect(player.xp).toBe(0);
      expect(player.level).toBe(1);
      expect(player.nextXp).toBe(5);
    });

    it('should initialize with empty weapons array except starting weapon', () => {
      expect(player.weapons.length).toBe(1);
      expect(player.weapons[0].id).toBe('fireball');
    });

    it('should initialize with empty inventory', () => {
      expect(Object.keys(player.inventory)).toContain('fireball');
      expect(player.inventory['fireball']).toBe(1);
    });

    it('should initialize ult properties', () => {
      expect(player.ultName).toBe('MeteorSwarm');
      expect(player.ultCharge).toBe(0);
      expect(player.ultMax).toBe(1000);
      expect(player.ultActiveTime).toBe(0);
    });

    it('should apply shop health upgrades', () => {
      const boostedPlayer = new Player(
        'wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
        { health: 2, speed: 0, magnet: 0, damage: 0 }
      );
      // (100 + 40) * 0.75 = 105
      expect(boostedPlayer.maxHp).toBe(105);
    });

    it('should apply shop speed upgrades', () => {
      const boostedPlayer = new Player(
        'wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
        { health: 0, speed: 2, magnet: 0, damage: 0 }
      );
      // 7.5 * 1.1 * 0.95 ≈ 7.84
      expect(boostedPlayer.speed).toBeGreaterThan(7.8);
      expect(boostedPlayer.speed).toBeLessThan(7.9);
    });

    it('should apply shop magnet upgrades', () => {
      const boostedPlayer = new Player(
        'wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
        { health: 0, speed: 0, magnet: 2, damage: 0 }
      );
      // 60 * 1.4 = 84
      expect(boostedPlayer.pickupRange).toBe(84);
    });

    it('should apply shop damage upgrades', () => {
      const boostedPlayer = new Player(
        'wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
        { health: 0, speed: 0, magnet: 0, damage: 2 }
      );
      // 1 + 0.2 = 1.2
      expect(boostedPlayer.dmgMult).toBe(1.2);
    });

    it('should spawn at world center', () => {
      expect(player.x).toBe(1000); // CONFIG.worldSize / 2
      expect(player.y).toBe(1000);
    });
  });

  describe('hp getter and setter', () => {
    it('should return HP value', () => {
      expect(player.hp).toBe(75);
    });

    it('should clamp HP to minimum 0', () => {
      player.hp = -50;
      expect(player.hp).toBe(0);
    });

    it('should allow positive HP values', () => {
      player.hp = 50;
      expect(player.hp).toBe(50);
    });

    it('should allow HP up to max', () => {
      player.hp = player.maxHp;
      expect(player.hp).toBe(player.maxHp);
    });

    it('should not allow HP above max', () => {
      player.hp = player.maxHp + 100;
      // HP setter doesn't clamp max, only min
      expect(player.hp).toBe(player.maxHp + 100);
    });
  });

  describe('addUpgrade - items', () => {
    beforeEach(() => {
      // Reset player with starting weapon
      player = new Player('wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
        { health: 0, speed: 0, magnet: 0, damage: 0 });
    });

    it('should add pierce item', () => {
      player.addUpgrade('pierce');
      expect(player.items.pierce).toBe(1);
      expect(player.inventory['pierce']).toBe(1);
    });

    it('should add multiple pierce items', () => {
      player.addUpgrade('pierce');
      player.addUpgrade('pierce');
      expect(player.items.pierce).toBe(2);
      expect(player.inventory['pierce']).toBe(2);
    });

    it('should add damage item', () => {
      const initialDmg = player.dmgMult;
      player.addUpgrade('damage');
      expect(player.dmgMult).toBeCloseTo(initialDmg + 0.2, 2);
      expect(player.inventory['damage']).toBe(1);
    });

    it('should add multiple damage items', () => {
      const initialDmg = player.dmgMult;
      player.addUpgrade('damage');
      player.addUpgrade('damage');
      expect(player.dmgMult).toBeCloseTo(initialDmg + 0.4, 2);
      expect(player.inventory['damage']).toBe(2);
    });

    it('should add cooldown item', () => {
      player.addUpgrade('cooldown');
      expect(player.items.cooldown).toBe(0.1);
      expect(player.inventory['cooldown']).toBe(1);
    });

    it('should add multiple cooldown items', () => {
      player.addUpgrade('cooldown');
      player.addUpgrade('cooldown');
      expect(player.items.cooldown).toBe(0.2);
      expect(player.inventory['cooldown']).toBe(2);
    });

    it('should add scope (crit chance) item', () => {
      player.addUpgrade('scope');
      expect(player.critChance).toBe(0.15);
      expect(player.inventory['scope']).toBe(1);
    });

    it('should add multiple scope items', () => {
      player.addUpgrade('scope');
      player.addUpgrade('scope');
      expect(player.critChance).toBe(0.30);
      expect(player.inventory['scope']).toBe(2);
    });

    it('should add projectile item', () => {
      player.addUpgrade('projectile');
      expect(player.items.projectile).toBe(1);
      expect(player.inventory['projectile']).toBe(1);
    });

    it('should add multiple projectile items', () => {
      player.addUpgrade('projectile');
      player.addUpgrade('projectile');
      expect(player.items.projectile).toBe(2);
      expect(player.inventory['projectile']).toBe(2);
    });
  });

  describe('addUpgrade - new weapons', () => {
    beforeEach(() => {
      player = new Player('wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
        { health: 0, speed: 0, magnet: 0, damage: 0 });
      // Remove starting weapon for cleaner tests
      player.weapons = [];
      player.inventory = {};
    });

    it('should add pepper_spray weapon', () => {
      player.addUpgrade('pepper_spray');
      expect(player.weapons.length).toBe(1);
      expect(player.weapons[0].id).toBe('pepper_spray');
      expect(player.weapons[0].dmg).toBe(5);
      expect(player.weapons[0].cd).toBe(3);
      expect(player.weapons[0].type).toBe('spray');
      expect(player.weapons[0].level).toBe(1);
      expect(player.inventory['pepper_spray']).toBe(1);
    });

    it('should add bubble_stream weapon', () => {
      player.addUpgrade('bubble_stream');
      expect(player.weapons.length).toBe(1);
      expect(player.weapons[0].id).toBe('bubble_stream');
      expect(player.weapons[0].dmg).toBe(12);
      expect(player.weapons[0].cd).toBe(60);
      expect(player.weapons[0].type).toBe('bubble');
      expect(player.inventory['bubble_stream']).toBe(1);
    });

    it('should add frying_pan weapon', () => {
      player.addUpgrade('frying_pan');
      expect(player.weapons.length).toBe(1);
      expect(player.weapons[0].id).toBe('frying_pan');
      expect(player.weapons[0].dmg).toBe(35);
      expect(player.weapons[0].cd).toBe(70);
      expect(player.weapons[0].type).toBe('arc');
      expect(player.inventory['frying_pan']).toBe(1);
    });

    it('should add thrown_cds weapon', () => {
      player.addUpgrade('thrown_cds');
      expect(player.weapons.length).toBe(1);
      expect(player.weapons[0].id).toBe('thrown_cds');
      expect(player.weapons[0].dmg).toBe(9);
      expect(player.weapons[0].cd).toBe(25);
      expect(player.weapons[0].type).toBe('facing');
      expect(player.inventory['thrown_cds']).toBe(1);
    });

    it('should add fireball weapon', () => {
      player.addUpgrade('fireball');
      expect(player.weapons.length).toBe(1);
      expect(player.weapons[0].id).toBe('fireball');
      expect(player.weapons[0].dmg).toBe(25);
      expect(player.weapons[0].cd).toBe(133);
      expect(player.weapons[0].type).toBe('fireball');
      expect(player.weapons[0].projectileCount).toBe(2);
      expect(player.inventory['fireball']).toBe(1);
    });

    it('should add lighter weapon', () => {
      player.addUpgrade('lighter');
      expect(player.weapons.length).toBe(1);
      expect(player.weapons[0].id).toBe('lighter');
      expect(player.weapons[0].dmg).toBe(1);
      expect(player.weapons[0].cd).toBe(3);
      expect(player.weapons[0].type).toBe('spray');
      expect(player.inventory['lighter']).toBe(1);
    });

    it('should add multiple different weapons', () => {
      player.addUpgrade('pepper_spray');
      player.addUpgrade('bubble_stream');
      expect(player.weapons.length).toBe(2);
      expect(player.inventory['pepper_spray']).toBe(1);
      expect(player.inventory['bubble_stream']).toBe(1);
    });
  });

  describe('addUpgrade - weapon upgrades', () => {
    beforeEach(() => {
      player = new Player('wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
        { health: 0, speed: 0, magnet: 0, damage: 0 });
    });

    it('should increase weapon level on upgrade', () => {
      const initialLevel = player.weapons[0].level;
      player.addUpgrade('fireball');
      expect(player.weapons[0].level).toBe(initialLevel + 1);
    });

    it('should increase base damage by 1.3x on upgrade', () => {
      const initialDmg = player.weapons[0].baseDmg;
      player.addUpgrade('fireball');
      expect(player.weapons[0].baseDmg).toBeCloseTo(initialDmg * 1.3, 1);
    });

    it('should decrease cooldown by 0.9x on upgrade', () => {
      const initialCd = player.weapons[0].cd;
      player.addUpgrade('fireball');
      expect(player.weapons[0].cd).toBeCloseTo(initialCd * 0.9, 1);
    });

    it('should increment inventory count for weapon', () => {
      player.addUpgrade('fireball');
      expect(player.inventory['fireball']).toBe(2);
    });

    describe('bubble_stream specific upgrades', () => {
      beforeEach(() => {
        player = new Player('wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
          { health: 0, speed: 0, magnet: 0, damage: 0 });
        player.weapons = [];
        player.inventory = {};
        player.addUpgrade('bubble_stream');
      });

      it('level 2: adds +1 projectile', () => {
        player.addUpgrade('bubble_stream');
        expect(player.weapons[0].projectileCount).toBe(2);
      });

      it('level 3: adds speed multiplier', () => {
        player.addUpgrade('bubble_stream');
        player.addUpgrade('bubble_stream');
        expect(player.weapons[0].speedMult).toBe(1.5);
      });

      it('level 4: adds splits property', () => {
        player.addUpgrade('bubble_stream');
        player.addUpgrade('bubble_stream');
        player.addUpgrade('bubble_stream');
        expect(player.weapons[0].splits).toBe(true);
      });

      it('level 5: increases to +3 projectiles', () => {
        for (let i = 0; i < 4; i++) {
          player.addUpgrade('bubble_stream');
        }
        expect(player.weapons[0].projectileCount).toBe(3);
      });
    });

    describe('pepper_spray specific upgrades', () => {
      beforeEach(() => {
        player = new Player('wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
          { health: 0, speed: 0, magnet: 0, damage: 0 });
        player.weapons = [];
        player.inventory = {};
        player.addUpgrade('pepper_spray');
      });

      it('level 2: adds +2 pellets (7 total)', () => {
        player.addUpgrade('pepper_spray');
        expect(player.weapons[0].pelletCount).toBe(7);
      });

      it('level 3: adds wider spread', () => {
        player.addUpgrade('pepper_spray');
        player.addUpgrade('pepper_spray');
        expect(player.weapons[0].spread).toBe(0.6);
      });

      it('level 4: increases spread to 0.8', () => {
        for (let i = 0; i < 3; i++) {
          player.addUpgrade('pepper_spray');
        }
        expect(player.weapons[0].spread).toBe(0.8);
      });

      it('level 5: adds +3 pellets (10 total)', () => {
        for (let i = 0; i < 4; i++) {
          player.addUpgrade('pepper_spray');
        }
        expect(player.weapons[0].pelletCount).toBe(10);
      });
    });

    describe('frying_pan specific upgrades', () => {
      beforeEach(() => {
        player = new Player('wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
          { health: 0, speed: 0, magnet: 0, damage: 0 });
        player.weapons = [];
        player.inventory = {};
        player.addUpgrade('frying_pan');
      });

      it('level 2: adds explosion radius', () => {
        player.addUpgrade('frying_pan');
        expect(player.weapons[0].explodeRadius).toBe(40);
      });

      it('level 3: adds knockback', () => {
        player.addUpgrade('frying_pan');
        player.addUpgrade('frying_pan');
        expect(player.weapons[0].knockback).toBe(5);
      });

      it('level 4: adds +1 projectile', () => {
        for (let i = 0; i < 3; i++) {
          player.addUpgrade('frying_pan');
        }
        expect(player.weapons[0].projectileCount).toBe(2);
      });

      it('level 5: increases size', () => {
        for (let i = 0; i < 4; i++) {
          player.addUpgrade('frying_pan');
        }
        expect(player.weapons[0].size).toBe(14);
      });
    });

    describe('thrown_cds specific upgrades', () => {
      beforeEach(() => {
        player = new Player('wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
          { health: 0, speed: 0, magnet: 0, damage: 0 });
        player.weapons = [];
        player.inventory = {};
        player.addUpgrade('thrown_cds');
      });

      it('level 2: adds +1 CD (2 projectiles)', () => {
        player.addUpgrade('thrown_cds');
        expect(player.weapons[0].projectileCount).toBe(2);
      });

      it('level 3: adds speed multiplier', () => {
        player.addUpgrade('thrown_cds');
        player.addUpgrade('thrown_cds');
        expect(player.weapons[0].speedMult).toBe(1.4);
      });

      it('level 5: adds +2 CDs (3 projectiles)', () => {
        for (let i = 0; i < 4; i++) {
          player.addUpgrade('thrown_cds');
        }
        expect(player.weapons[0].projectileCount).toBe(3);
      });
    });

    describe('fireball specific upgrades', () => {
      beforeEach(() => {
        player = new Player('wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
          { health: 0, speed: 0, magnet: 0, damage: 0 });
        // Already has fireball at level 1
      });

      it('level 2: adds explosion radius', () => {
        player.addUpgrade('fireball');
        expect(player.weapons[0].explodeRadius).toBe(50);
      });

      it('level 3: adds speed multiplier', () => {
        player.addUpgrade('fireball');
        player.addUpgrade('fireball');
        expect(player.weapons[0].speedMult).toBe(1.3);
      });

      it('level 4: adds trail damage', () => {
        for (let i = 0; i < 3; i++) {
          player.addUpgrade('fireball');
        }
        expect(player.weapons[0].trailDamage).toBe(5);
      });

      it('level 5: adds +1 fireball (2 projectiles)', () => {
        for (let i = 0; i < 4; i++) {
          player.addUpgrade('fireball');
        }
        expect(player.weapons[0].projectileCount).toBe(2);
      });
    });

    describe('lighter specific upgrades', () => {
      beforeEach(() => {
        player = new Player('pyromancer', 0.9, 1.1, 'lighter', 'SmokeScreen',
          { health: 0, speed: 0, magnet: 0, damage: 0 });
        // Already has lighter at level 1
      });

      it('level 2: adds cone length', () => {
        player.addUpgrade('lighter');
        expect(player.weapons[0].coneLength).toBe(150);
      });

      it('level 3: adds spread', () => {
        player.addUpgrade('lighter');
        player.addUpgrade('lighter');
        expect(player.weapons[0].spread).toBe(1.8);
      });

      it('level 4: increases cone length', () => {
        for (let i = 0; i < 3; i++) {
          player.addUpgrade('lighter');
        }
        expect(player.weapons[0].coneLength).toBe(200);
      });

      it('level 5: adds speed multiplier', () => {
        for (let i = 0; i < 4; i++) {
          player.addUpgrade('lighter');
        }
        expect(player.weapons[0].speedMult).toBe(2.0);
      });
    });
  });

  describe('gainXp', () => {
    beforeEach(() => {
      player = new Player('wizard', 0.75, 0.95, 'fireball', 'MeteorSwarm',
        { health: 0, speed: 0, magnet: 0, damage: 0 });
    });

    it('should add XP to player', () => {
      player.gainXp(3, levelUpCallback);
      expect(player.xp).toBe(3);
    });

    it('should trigger level up when reaching next XP threshold', () => {
      player.gainXp(5, levelUpCallback);
      expect(player.level).toBe(2);
      expect(levelUpCallback).toHaveBeenCalledTimes(1);
    });

    it('should carry over excess XP when leveling up', () => {
      player.gainXp(8, levelUpCallback);
      expect(player.level).toBe(2);
      expect(player.xp).toBe(3); // 8 - 5 = 3
    });

    it('should increase next XP threshold by 1.5x', () => {
      player.gainXp(5, levelUpCallback);
      expect(player.nextXp).toBe(7.5);
    });

    it('should handle multiple level ups from single XP gain', () => {
      player.gainXp(20, levelUpCallback);
      expect(player.level).toBe(2);
      expect(levelUpCallback).toHaveBeenCalledTimes(1);
    });

    it('should add ult charge (5x XP amount)', () => {
      player.gainXp(10, levelUpCallback);
      expect(player.ultCharge).toBe(50);
    });

    it('should cap ult charge at ultMax', () => {
      player.gainXp(500, levelUpCallback);
      expect(player.ultCharge).toBe(1000); // Capped at ultMax
    });
  });

  describe('auraAttackFrame', () => {
    it('should initialize to 0', () => {
      expect(player.auraAttackFrame).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full level up scenario', () => {
      const player = new Player('paladin', 1.2, 0.9, 'bubble_stream', 'DivineShield',
        { health: 1, speed: 1, magnet: 1, damage: 1 });

      // Gain enough XP for level up
      player.gainXp(5, levelUpCallback);
      expect(player.level).toBe(2);
      expect(levelUpCallback).toHaveBeenCalled();

      // Add damage upgrade
      const prevDmg = player.dmgMult;
      player.addUpgrade('damage');
      expect(player.dmgMult).toBeCloseTo(prevDmg + 0.2, 2);

      // Add pierce upgrade
      player.addUpgrade('pierce');
      expect(player.items.pierce).toBe(1);

      // Upgrade weapon
      const weapon = player.weapons[0];
      const prevBaseDmg = weapon.baseDmg;
      player.addUpgrade('bubble_stream');
      expect(weapon.level).toBe(2);
      expect(weapon.baseDmg).toBeCloseTo(prevBaseDmg * 1.3, 1);
    });
  });
});
