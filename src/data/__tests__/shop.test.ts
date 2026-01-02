import { describe, it, expect } from 'vitest';
import { SHOP_ITEMS } from '../shop';

describe('SHOP_ITEMS', () => {
  it('should be defined', () => {
    expect(SHOP_ITEMS).toBeDefined();
  });

  describe('damage shop item', () => {
    it('should exist', () => {
      expect(SHOP_ITEMS.damage).toBeDefined();
    });

    it('should have correct properties', () => {
      expect(SHOP_ITEMS.damage.name).toBe('Might');
      expect(SHOP_ITEMS.damage.desc).toBe('+10% Dmg');
      expect(typeof SHOP_ITEMS.damage.cost).toBe('function');
      expect(SHOP_ITEMS.damage.max).toBe(5);
    });

    it('should calculate cost correctly', () => {
      expect(SHOP_ITEMS.damage.cost(0)).toBe(100); // 100 * (0 + 1) = 100
      expect(SHOP_ITEMS.damage.cost(1)).toBe(200); // 100 * (1 + 1) = 200
      expect(SHOP_ITEMS.damage.cost(2)).toBe(300); // 100 * (2 + 1) = 300
      expect(SHOP_ITEMS.damage.cost(4)).toBe(500); // 100 * (4 + 1) = 500
    });

    it('should have max level 5', () => {
      expect(SHOP_ITEMS.damage.max).toBe(5);
    });
  });

  describe('health shop item', () => {
    it('should exist', () => {
      expect(SHOP_ITEMS.health).toBeDefined();
    });

    it('should have correct properties', () => {
      expect(SHOP_ITEMS.health.name).toBe('Vitality');
      expect(SHOP_ITEMS.health.desc).toBe('+20 HP');
      expect(typeof SHOP_ITEMS.health.cost).toBe('function');
      expect(SHOP_ITEMS.health.max).toBe(5);
    });

    it('should calculate cost correctly', () => {
      expect(SHOP_ITEMS.health.cost(0)).toBe(80); // 80 * (0 + 1) = 80
      expect(SHOP_ITEMS.health.cost(1)).toBe(160); // 80 * (1 + 1) = 160
      expect(SHOP_ITEMS.health.cost(2)).toBe(240); // 80 * (2 + 1) = 240
      expect(SHOP_ITEMS.health.cost(4)).toBe(400); // 80 * (4 + 1) = 400
    });

    it('should have max level 5', () => {
      expect(SHOP_ITEMS.health.max).toBe(5);
    });
  });

  describe('speed shop item', () => {
    it('should exist', () => {
      expect(SHOP_ITEMS.speed).toBeDefined();
    });

    it('should have correct properties', () => {
      expect(SHOP_ITEMS.speed.name).toBe('Haste');
      expect(SHOP_ITEMS.speed.desc).toBe('+5% Spd');
      expect(typeof SHOP_ITEMS.speed.cost).toBe('function');
      expect(SHOP_ITEMS.speed.max).toBe(3);
    });

    it('should calculate cost correctly', () => {
      expect(SHOP_ITEMS.speed.cost(0)).toBe(150); // 150 * (0 + 1) = 150
      expect(SHOP_ITEMS.speed.cost(1)).toBe(300); // 150 * (1 + 1) = 300
      expect(SHOP_ITEMS.speed.cost(2)).toBe(450); // 150 * (2 + 1) = 450
    });

    it('should have max level 3', () => {
      expect(SHOP_ITEMS.speed.max).toBe(3);
    });
  });

  describe('magnet shop item', () => {
    it('should exist', () => {
      expect(SHOP_ITEMS.magnet).toBeDefined();
    });

    it('should have correct properties', () => {
      expect(SHOP_ITEMS.magnet.name).toBe('Magnet');
      expect(SHOP_ITEMS.magnet.desc).toBe('+20% Rng');
      expect(typeof SHOP_ITEMS.magnet.cost).toBe('function');
      expect(SHOP_ITEMS.magnet.max).toBe(3);
    });

    it('should calculate cost correctly', () => {
      expect(SHOP_ITEMS.magnet.cost(0)).toBe(100); // 100 * (0 + 1) = 100
      expect(SHOP_ITEMS.magnet.cost(1)).toBe(200); // 100 * (1 + 1) = 200
      expect(SHOP_ITEMS.magnet.cost(2)).toBe(300); // 100 * (2 + 1) = 300
    });

    it('should have max level 3', () => {
      expect(SHOP_ITEMS.magnet.max).toBe(3);
    });
  });

  describe('shop item count', () => {
    it('should have 4 shop items', () => {
      expect(Object.keys(SHOP_ITEMS).length).toBe(4);
    });
  });

  describe('shop item structure', () => {
    it('should have name on all items', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        expect(item.name).toBeDefined();
        expect(typeof item.name).toBe('string');
        expect(item.name.length).toBeGreaterThan(0);
      });
    });

    it('should have description on all items', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        expect(item.desc).toBeDefined();
        expect(typeof item.desc).toBe('string');
        expect(item.desc.length).toBeGreaterThan(0);
      });
    });

    it('should have cost function on all items', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        expect(item.cost).toBeDefined();
        expect(typeof item.cost).toBe('function');
      });
    });

    it('should have max level on all items', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        expect(item.max).toBeDefined();
        expect(typeof item.max).toBe('number');
        expect(item.max).toBeGreaterThan(0);
      });
    });
  });

  describe('cost progression', () => {
    it('should increase cost with level', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        const cost0 = item.cost(0);
        const cost1 = item.cost(1);
        const cost2 = item.cost(2);
        expect(cost1).toBeGreaterThan(cost0);
        expect(cost2).toBeGreaterThan(cost1);
      });
    });

    it('should use linear cost scaling', () => {
      // Cost should be: base * (level + 1)
      Object.values(SHOP_ITEMS).forEach(item => {
        const cost0 = item.cost(0);
        const cost1 = item.cost(1);
        const baseCost = cost0;
        expect(cost1).toBe(baseCost * 2);
      });
    });
  });

  describe('max level constraints', () => {
    it('should have appropriate max levels', () => {
      // Damage and Health: max 5
      expect(SHOP_ITEMS.damage.max).toBe(5);
      expect(SHOP_ITEMS.health.max).toBe(5);

      // Speed and Magnet: max 3 (more powerful upgrades)
      expect(SHOP_ITEMS.speed.max).toBe(3);
      expect(SHOP_ITEMS.magnet.max).toBe(3);
    });

    it('should not allow zero max level', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        expect(item.max).toBeGreaterThan(0);
      });
    });
  });

  describe('cost ranges', () => {
    it('should have reasonable base costs', () => {
      expect(SHOP_ITEMS.health.cost(0)).toBe(80); // Cheapest
      expect(SHOP_ITEMS.damage.cost(0)).toBe(100);
      expect(SHOP_ITEMS.magnet.cost(0)).toBe(100);
      expect(SHOP_ITEMS.speed.cost(0)).toBe(150); // Most expensive base
    });

    it('should have reasonable max upgrade costs', () => {
      expect(SHOP_ITEMS.health.cost(4)).toBe(400); // 80 * 5
      expect(SHOP_ITEMS.damage.cost(4)).toBe(500); // 100 * 5
      expect(SHOP_ITEMS.magnet.cost(2)).toBe(300); // 100 * 3
      expect(SHOP_ITEMS.speed.cost(2)).toBe(450); // 150 * 3
    });
  });

  describe('item descriptions', () => {
    it('should describe the benefit clearly', () => {
      expect(SHOP_ITEMS.damage.desc).toContain('%');
      expect(SHOP_ITEMS.health.desc).toContain('HP');
      expect(SHOP_ITEMS.speed.desc).toContain('%');
      expect(SHOP_ITEMS.magnet.desc).toContain('%');
    });
  });

  describe('item names', () => {
    it('should have thematic names', () => {
      expect(SHOP_ITEMS.damage.name).toBe('Might');
      expect(SHOP_ITEMS.health.name).toBe('Vitality');
      expect(SHOP_ITEMS.speed.name).toBe('Haste');
      expect(SHOP_ITEMS.magnet.name).toBe('Magnet');
    });
  });

  describe('shop item keys', () => {
    it('should have matching keys for upgrade types', () => {
      const upgradeKeys = ['damage', 'health', 'speed', 'magnet'];
      upgradeKeys.forEach(key => {
        expect(SHOP_ITEMS[key]).toBeDefined();
      });
    });
  });

  describe('total upgrade costs', () => {
    it('should calculate total cost to max damage', () => {
      // 100 + 200 + 300 + 400 + 500 = 1500
      const total = [0, 1, 2, 3, 4].reduce((sum, level) => sum + SHOP_ITEMS.damage.cost(level), 0);
      expect(total).toBe(1500);
    });

    it('should calculate total cost to max health', () => {
      // 80 + 160 + 240 + 320 + 400 = 1200
      const total = [0, 1, 2, 3, 4].reduce((sum, level) => sum + SHOP_ITEMS.health.cost(level), 0);
      expect(total).toBe(1200);
    });

    it('should calculate total cost to max speed', () => {
      // 150 + 300 + 450 = 900
      const total = [0, 1, 2].reduce((sum, level) => sum + SHOP_ITEMS.speed.cost(level), 0);
      expect(total).toBe(900);
    });

    it('should calculate total cost to max magnet', () => {
      // 100 + 200 + 300 = 600
      const total = [0, 1, 2].reduce((sum, level) => sum + SHOP_ITEMS.magnet.cost(level), 0);
      expect(total).toBe(600);
    });

    it('should calculate total cost to max all upgrades', () => {
      // 1500 + 1200 + 900 + 600 = 4200
      const damageTotal = [0, 1, 2, 3, 4].reduce((sum, level) => sum + SHOP_ITEMS.damage.cost(level), 0);
      const healthTotal = [0, 1, 2, 3, 4].reduce((sum, level) => sum + SHOP_ITEMS.health.cost(level), 0);
      const speedTotal = [0, 1, 2].reduce((sum, level) => sum + SHOP_ITEMS.speed.cost(level), 0);
      const magnetTotal = [0, 1, 2].reduce((sum, level) => sum + SHOP_ITEMS.magnet.cost(level), 0);
      const grandTotal = damageTotal + healthTotal + speedTotal + magnetTotal;
      expect(grandTotal).toBe(4200);
    });
  });
});
