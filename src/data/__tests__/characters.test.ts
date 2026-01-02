import { describe, it, expect } from 'vitest';
import { CHARACTERS } from '../characters';

describe('CHARACTERS', () => {
  it('should be defined', () => {
    expect(CHARACTERS).toBeDefined();
  });

  it('should have dungeonMaster character', () => {
    expect(CHARACTERS.dungeonMaster).toBeDefined();
    expect(CHARACTERS.dungeonMaster.id).toBe('dungeonMaster');
    expect(CHARACTERS.dungeonMaster.name).toBe('Dungeon Master');
    expect(CHARACTERS.dungeonMaster.icon).toBe('🐉');
    expect(CHARACTERS.dungeonMaster.weapon).toBe('fireball');
    expect(CHARACTERS.dungeonMaster.hpMod).toBe(0.75);
    expect(CHARACTERS.dungeonMaster.spdMod).toBe(0.95);
    expect(CHARACTERS.dungeonMaster.ult).toBe('MeteorSwarm');
    expect(CHARACTERS.dungeonMaster.desc).toBe('Arcane power. Start: Fireball.');
  });

  it('should have janitor character', () => {
    expect(CHARACTERS.janitor).toBeDefined();
    expect(CHARACTERS.janitor.id).toBe('janitor');
    expect(CHARACTERS.janitor.name).toBe('Janitor');
    expect(CHARACTERS.janitor.icon).toBe('🧹');
    expect(CHARACTERS.janitor.weapon).toBe('bubble_stream');
    expect(CHARACTERS.janitor.hpMod).toBe(1.2);
    expect(CHARACTERS.janitor.spdMod).toBe(0.9);
    expect(CHARACTERS.janitor.ult).toBe('ClosingTime');
    expect(CHARACTERS.janitor.desc).toBe('Tanky. Start: Bubble Stream.');
  });

  it('should have skater character', () => {
    expect(CHARACTERS.skater).toBeDefined();
    expect(CHARACTERS.skater.id).toBe('skater');
    expect(CHARACTERS.skater.name).toBe('Skater');
    expect(CHARACTERS.skater.icon).toBe('🛹');
    expect(CHARACTERS.skater.weapon).toBe('thrown_cds');
    expect(CHARACTERS.skater.hpMod).toBe(0.8);
    expect(CHARACTERS.skater.spdMod).toBe(1.3);
    expect(CHARACTERS.skater.ult).toBe('Ollie');
    expect(CHARACTERS.skater.desc).toBe('Fast. Start: Thrown CDs.');
  });

  it('should have mallCop character', () => {
    expect(CHARACTERS.mallCop).toBeDefined();
    expect(CHARACTERS.mallCop.id).toBe('mallCop');
    expect(CHARACTERS.mallCop.name).toBe('Mall Cop');
    expect(CHARACTERS.mallCop.icon).toBe('👮');
    expect(CHARACTERS.mallCop.weapon).toBe('pepper_spray');
    expect(CHARACTERS.mallCop.hpMod).toBe(1.5);
    expect(CHARACTERS.mallCop.spdMod).toBe(0.8);
    expect(CHARACTERS.mallCop.ult).toBe('Security');
    expect(CHARACTERS.mallCop.desc).toBe('High HP. Start: Pepper Spray.');
  });

  it('should have foodCourt (Chef) character', () => {
    expect(CHARACTERS.foodCourt).toBeDefined();
    expect(CHARACTERS.foodCourt.id).toBe('foodCourt');
    expect(CHARACTERS.foodCourt.name).toBe('Chef');
    expect(CHARACTERS.foodCourt.icon).toBe('🍔');
    expect(CHARACTERS.foodCourt.weapon).toBe('frying_pan');
    expect(CHARACTERS.foodCourt.hpMod).toBe(1.0);
    expect(CHARACTERS.foodCourt.spdMod).toBe(1.0);
    expect(CHARACTERS.foodCourt.ult).toBe('GreaseFire');
    expect(CHARACTERS.foodCourt.desc).toBe('Balanced. Start: Frying Pan.');
  });

  it('should have teenager character', () => {
    expect(CHARACTERS.teenager).toBeDefined();
    expect(CHARACTERS.teenager.id).toBe('teenager');
    expect(CHARACTERS.teenager.name).toBe('Teenager');
    expect(CHARACTERS.teenager.icon).toBe('🧢');
    expect(CHARACTERS.teenager.weapon).toBe('lighter');
    expect(CHARACTERS.teenager.hpMod).toBe(0.9);
    expect(CHARACTERS.teenager.spdMod).toBe(1.1);
    expect(CHARACTERS.teenager.ult).toBe('VapeCloud');
    expect(CHARACTERS.teenager.desc).toBe('Reckless. Start: Lighter.');
  });

  describe('character count', () => {
    it('should have 6 characters', () => {
      expect(Object.keys(CHARACTERS).length).toBe(6);
    });
  });

  describe('character weapons', () => {
    it('should assign unique weapons where appropriate', () => {
      const weapons = Object.values(CHARACTERS).map(c => c.weapon);
      expect(weapons).toContain('fireball');
      expect(weapons).toContain('bubble_stream');
      expect(weapons).toContain('thrown_cds');
      expect(weapons).toContain('pepper_spray');
      expect(weapons).toContain('frying_pan');
      expect(weapons).toContain('lighter');
    });
  });

  describe('character balance', () => {
    it('should have valid hpMod values (0.5 to 2.0)', () => {
      Object.values(CHARACTERS).forEach(char => {
        expect(char.hpMod).toBeGreaterThanOrEqual(0.5);
        expect(char.hpMod).toBeLessThanOrEqual(2.0);
      });
    });

    it('should have valid spdMod values (0.5 to 2.0)', () => {
      Object.values(CHARACTERS).forEach(char => {
        expect(char.spdMod).toBeGreaterThanOrEqual(0.5);
        expect(char.spdMod).toBeLessThanOrEqual(2.0);
      });
    });

    it('should have total stats (hpMod + spdMod) close to balanced range', () => {
      // Most characters should have total stats between 1.8 and 2.4
      Object.values(CHARACTERS).forEach(char => {
        const total = char.hpMod + char.spdMod;
        expect(total).toBeGreaterThan(1.5);
        expect(total).toBeLessThan(2.8);
      });
    });
  });

  describe('character ultimates', () => {
    it('should have ult names for all characters', () => {
      Object.values(CHARACTERS).forEach(char => {
        expect(char.ult).toBeDefined();
        expect(typeof char.ult).toBe('string');
        expect(char.ult.length).toBeGreaterThan(0);
      });
    });

    it('should have unique ult names', () => {
      const ults = Object.values(CHARACTERS).map(c => c.ult);
      const uniqueUlts = new Set(ults);
      expect(uniqueUlts.size).toBe(ults.length);
    });
  });

  describe('character descriptions', () => {
    it('should have descriptions for all characters', () => {
      Object.values(CHARACTERS).forEach(char => {
        expect(char.desc).toBeDefined();
        expect(typeof char.desc).toBe('string');
        expect(char.desc.length).toBeGreaterThan(0);
      });
    });
  });

  describe('character structure', () => {
    it('should have all required properties on each character', () => {
      Object.values(CHARACTERS).forEach(char => {
        expect(char.id).toBeDefined();
        expect(char.name).toBeDefined();
        expect(char.icon).toBeDefined();
        expect(char.weapon).toBeDefined();
        expect(char.hpMod).toBeDefined();
        expect(char.spdMod).toBeDefined();
        expect(char.ult).toBeDefined();
        expect(char.desc).toBeDefined();
      });
    });

    it('should match id to object key', () => {
      Object.entries(CHARACTERS).forEach(([key, char]) => {
        expect(char.id).toBe(key);
      });
    });
  });

  describe('character archetypes', () => {
    it('should have tanky characters (high hpMod, low spdMod)', () => {
      const tanks = Object.values(CHARACTERS).filter(c => c.hpMod >= 1.2 && c.spdMod <= 1.0);
      expect(tanks.length).toBeGreaterThan(0);
    });

    it('should have fast characters (low hpMod, high spdMod)', () => {
      const fast = Object.values(CHARACTERS).filter(c => c.hpMod <= 1.0 && c.spdMod >= 1.1);
      expect(fast.length).toBeGreaterThan(0);
    });

    it('should have balanced characters (hpMod and spdMod near 1.0)', () => {
      const balanced = Object.values(CHARACTERS).filter(c =>
        Math.abs(c.hpMod - 1.0) <= 0.1 && Math.abs(c.spdMod - 1.0) <= 0.1
      );
      expect(balanced.length).toBeGreaterThan(0);
    });
  });

  describe('character icons', () => {
    it('should have emoji icons for all characters', () => {
      Object.values(CHARACTERS).forEach(char => {
        // Emoji should be a string
        expect(typeof char.icon).toBe('string');
        // Should contain at least one character
        expect(char.icon.length).toBeGreaterThan(0);
      });
    });
  });
});
