import { describe, it, expect } from 'vitest';
import { CHARACTERS } from '../characters';

describe('CHARACTERS', () => {
  it('should be defined', () => {
    expect(CHARACTERS).toBeDefined();
  });

  it('should have wizard character', () => {
    expect(CHARACTERS.wizard).toBeDefined();
    expect(CHARACTERS.wizard.id).toBe('wizard');
    expect(CHARACTERS.wizard.name).toBe('Wizard');
    expect(CHARACTERS.wizard.icon).toBe('🧙');
    expect(CHARACTERS.wizard.weapon).toBe('fireball');
    expect(CHARACTERS.wizard.hpMod).toBe(0.75);
    expect(CHARACTERS.wizard.spdMod).toBe(0.95);
    expect(CHARACTERS.wizard.ult).toBe('Meteor Swarm');
    expect(CHARACTERS.wizard.desc).toBe('Arcane power. Start: Fireball.');
  });

  it('should have paladin character', () => {
    expect(CHARACTERS.paladin).toBeDefined();
    expect(CHARACTERS.paladin.id).toBe('paladin');
    expect(CHARACTERS.paladin.name).toBe('Paladin');
    expect(CHARACTERS.paladin.icon).toBe('🛡️');
    expect(CHARACTERS.paladin.weapon).toBe('bubble_stream');
    expect(CHARACTERS.paladin.hpMod).toBe(1.2);
    expect(CHARACTERS.paladin.spdMod).toBe(0.9);
    expect(CHARACTERS.paladin.ult).toBe('Divine Shield');
    expect(CHARACTERS.paladin.desc).toBe('Tanky. Start: Holy Aura.');
  });

  it('should have rogue character', () => {
    expect(CHARACTERS.rogue).toBeDefined();
    expect(CHARACTERS.rogue.id).toBe('rogue');
    expect(CHARACTERS.rogue.name).toBe('Rogue');
    expect(CHARACTERS.rogue.icon).toBe('🗡️');
    expect(CHARACTERS.rogue.weapon).toBe('thrown_cds');
    expect(CHARACTERS.rogue.hpMod).toBe(0.8);
    expect(CHARACTERS.rogue.spdMod).toBe(1.3);
    expect(CHARACTERS.rogue.ult).toBe('Shadow Step');
    expect(CHARACTERS.rogue.desc).toBe('Fast. Start: Dagger Throw.');
  });

  it('should have knight character', () => {
    expect(CHARACTERS.knight).toBeDefined();
    expect(CHARACTERS.knight.id).toBe('knight');
    expect(CHARACTERS.knight.name).toBe('Knight');
    expect(CHARACTERS.knight.icon).toBe('⚔️');
    expect(CHARACTERS.knight.weapon).toBe('shield_bash');
    expect(CHARACTERS.knight.hpMod).toBe(1.5);
    expect(CHARACTERS.knight.spdMod).toBe(0.8);
    expect(CHARACTERS.knight.ult).toBe('Iron Will');
    expect(CHARACTERS.knight.desc).toBe('High HP. Start: Shield Bash.');
  });

  it('should have berserker character', () => {
    expect(CHARACTERS.berserker).toBeDefined();
    expect(CHARACTERS.berserker.id).toBe('berserker');
    expect(CHARACTERS.berserker.name).toBe('Berserker');
    expect(CHARACTERS.berserker.icon).toBe('🪓');
    expect(CHARACTERS.berserker.weapon).toBe('frying_pan');
    expect(CHARACTERS.berserker.hpMod).toBe(1.0);
    expect(CHARACTERS.berserker.spdMod).toBe(1.0);
    expect(CHARACTERS.berserker.ult).toBe('Inferno');
    expect(CHARACTERS.berserker.desc).toBe('Balanced. Start: War Hammer.');
  });

  it('should have pyromancer character', () => {
    expect(CHARACTERS.pyromancer).toBeDefined();
    expect(CHARACTERS.pyromancer.id).toBe('pyromancer');
    expect(CHARACTERS.pyromancer.name).toBe('Pyromancer');
    expect(CHARACTERS.pyromancer.icon).toBe('🔥');
    expect(CHARACTERS.pyromancer.weapon).toBe('lighter');
    expect(CHARACTERS.pyromancer.hpMod).toBe(0.9);
    expect(CHARACTERS.pyromancer.spdMod).toBe(1.1);
    expect(CHARACTERS.pyromancer.ult).toBe('Smoke Screen');
    expect(CHARACTERS.pyromancer.desc).toBe('Reckless. Start: Flame Burst.');
  });

  it('should have ranger character', () => {
    expect(CHARACTERS.ranger).toBeDefined();
    expect(CHARACTERS.ranger.id).toBe('ranger');
    expect(CHARACTERS.ranger.name).toBe('Ranger');
    expect(CHARACTERS.ranger.icon).toBe('🏹');
    expect(CHARACTERS.ranger.weapon).toBe('bow');
    expect(CHARACTERS.ranger.hpMod).toBe(0.9);
    expect(CHARACTERS.ranger.spdMod).toBe(1.15);
    expect(CHARACTERS.ranger.ult).toBe('Volley');
    expect(CHARACTERS.ranger.desc).toBe('Agile ranged. Start: Bow.');
  });

  describe('character count', () => {
    it('should have 7 characters', () => {
      expect(Object.keys(CHARACTERS).length).toBe(7);
    });

    it('should include all fantasy classes', () => {
      const charIds = Object.keys(CHARACTERS);
      expect(charIds).toContain('wizard');
      expect(charIds).toContain('paladin');
      expect(charIds).toContain('rogue');
      expect(charIds).toContain('knight');
      expect(charIds).toContain('berserker');
      expect(charIds).toContain('pyromancer');
      expect(charIds).toContain('ranger');
    });
  });

  describe('character weapons', () => {
    it('should assign unique weapons where appropriate', () => {
      const weapons = Object.values(CHARACTERS).map(c => c.weapon);
      expect(weapons).toContain('fireball');
      expect(weapons).toContain('bubble_stream');
      expect(weapons).toContain('thrown_cds');
      expect(weapons).toContain('shield_bash');
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
