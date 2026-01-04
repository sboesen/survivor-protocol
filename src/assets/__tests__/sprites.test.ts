import { describe, it, expect } from 'vitest';
import { SPRITES } from '../sprites';

describe('SPRITES', () => {
  it('should export a sprites object', () => {
    expect(SPRITES).toBeDefined();
    expect(typeof SPRITES).toBe('object');
  });

  it('should have all expected player sprites', () => {
    const expectedSprites = ['paladin', 'rogue', 'knight', 'berserker', 'wizard', 'pyromancer'];
    expectedSprites.forEach(sprite => {
      expect(SPRITES).toHaveProperty(sprite);
    });
  });

  it('should have all expected enemy sprites', () => {
    const expectedSprites = ['shopper', 'sprinter', 'armored', 'manager'];
    expectedSprites.forEach(sprite => {
      expect(SPRITES).toHaveProperty(sprite);
    });
  });

  it('should have sprite data as array of strings', () => {
    Object.values(SPRITES).forEach(sprite => {
      expect(Array.isArray(sprite)).toBe(true);
      sprite.forEach(row => {
        expect(typeof row).toBe('string');
      });
    });
  });

  it('should have consistent sprite dimensions (10 rows x 10 cols)', () => {
    Object.values(SPRITES).forEach(sprite => {
      expect(sprite.length).toBe(10); // 10 rows
      sprite.forEach(row => {
        expect(row.length).toBeLessThanOrEqual(10); // Up to 10 columns
      });
    });
  });

  describe('player sprites', () => {
    it('should have paladin sprite', () => {
      expect(SPRITES.paladin).toBeDefined();
      expect(SPRITES.paladin.length).toBe(10);
      expect(SPRITES.paladin[0]).toContain('1');
    });

    it('should have rogue sprite', () => {
      expect(SPRITES.rogue).toBeDefined();
      expect(SPRITES.rogue.length).toBe(10);
      expect(SPRITES.rogue[0]).toContain('r');
    });

    it('should have knight sprite', () => {
      expect(SPRITES.knight).toBeDefined();
      expect(SPRITES.knight.length).toBe(10);
      expect(SPRITES.knight[0]).toContain('b');
    });

    it('should have berserker sprite', () => {
      expect(SPRITES.berserker).toBeDefined();
      expect(SPRITES.berserker.length).toBe(10);
      expect(SPRITES.berserker[0]).toContain('w');
    });

    it('should have wizard sprite', () => {
      expect(SPRITES.wizard).toBeDefined();
      expect(SPRITES.wizard.length).toBe(10);
      expect(SPRITES.wizard[1]).toContain('3');
    });

    it('should have pyromancer sprite', () => {
      expect(SPRITES.pyromancer).toBeDefined();
      expect(SPRITES.pyromancer.length).toBe(10);
      expect(SPRITES.pyromancer[0]).toContain('p');
    });
  });

  describe('enemy sprites', () => {
    it('should have shopper sprite', () => {
      expect(SPRITES.shopper).toBeDefined();
      expect(SPRITES.shopper.length).toBe(10);
      expect(SPRITES.shopper[0]).toContain('w');
    });

    it('should have sprinter sprite', () => {
      expect(SPRITES.sprinter).toBeDefined();
      expect(SPRITES.sprinter.length).toBe(10);
      expect(SPRITES.sprinter[2]).toContain('d');
    });

    it('should have armored sprite', () => {
      expect(SPRITES.armored).toBeDefined();
      expect(SPRITES.armored.length).toBe(10);
      expect(SPRITES.armored[0]).toContain('1');
    });

    it('should have manager sprite', () => {
      expect(SPRITES.manager).toBeDefined();
      expect(SPRITES.manager.length).toBe(10);
      expect(SPRITES.manager[0]).toContain('w');
    });
  });

  describe('sprite content validation', () => {
    it('should only use valid palette keys', () => {
      const validKeys = new Set(['.', 's', 'b', 'd', 'g', 'r', 'p', 'w', '1', '2', '3', 'k', 'e', 'y', ' ']);

      Object.values(SPRITES).forEach(sprite => {
        sprite.forEach(row => {
          [...row].forEach(char => {
            if (char !== ' ') {
              expect(validKeys.has(char)).toBe(true);
            }
          });
        });
      });
    });

    it('should have non-empty content for all sprites', () => {
      Object.entries(SPRITES).forEach(([name, sprite]) => {
        const nonEmptyRows = sprite.filter(row => row.trim().length > 0);
        expect(nonEmptyRows.length).toBeGreaterThan(0);
      });
    });
  });
});
