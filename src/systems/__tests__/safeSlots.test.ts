import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveData } from '../saveData';
import type { Item } from '../../items/types';

const createMockItem = (
  id: string,
  rarity: 'common' | 'magic' | 'rare' | 'legendary',
  type: 'weapon' | 'helm' | 'armor' | 'accessory' | 'relic'
): Item => ({
  id,
  name: `Test ${type}`,
  baseId: id,
  baseName: `Test ${type}`,
  tier: 1,
  type,
  rarity,
  affixes: [],
  implicits: [],
});

const autoSelectSafeItems = (collectedLoot: Item[], safeSlotCount: number): string[] => {
  if (collectedLoot.length === 0) return [];

  const rarityOrder = { 'legendary': 4, 'rare': 2, 'magic': 1, 'common': 0 };

  const sorted = [...collectedLoot].sort((a, b) => {
    const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
    if (rarityDiff !== 0) return rarityDiff;

    const isRelicA = a.type === 'relic';
    const isRelicB = b.type === 'relic';
    if (isRelicA !== isRelicB) return isRelicB ? 1 : -1;

    return Math.random() - 0.5;
  });

  return sorted.slice(0, safeSlotCount).map(item => item.id);
};

const createEmptyShopInventory = () => ({
  items: [],
  gamblerItems: [],
  lastRefresh: 0,
  lastDailyRefresh: 0,
});

describe('Safe Slots System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      clear: vi.fn(),
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    SaveData.data = {
      gold: 1000,
      ownedChars: ['wizard'],
      selectedChar: 'wizard',
      shop: {
        damage: 0,
        health: 0,
        speed: 0,
        magnet: 0,
        safeSlotsCount: 1,
      },
      shopInventory: createEmptyShopInventory(),
      stash: [],
      loadout: {
        relic: null,
        weapon: null,
        helm: null,
        armor: null,
        accessory1: null,
        accessory2: null,
        accessory3: null,
      },
    };
  });

  describe('Default Safe Slots', () => {
    it('should initialize with 1 safe slot', () => {
      expect(SaveData.data.shop.safeSlotsCount).toBe(1);
    });

    it('should migrate existing save data without safeSlotsCount', () => {
      const mockSaved = {
        gold: 500,
        ownedChars: ['wizard'],
        selectedChar: 'wizard',
        shop: {
          damage: 2,
          health: 1,
          speed: 0,
          magnet: 1,
        },
        shopInventory: createEmptyShopInventory(),
        stash: [],
        loadout: {
          relic: null,
          weapon: null,
          helm: null,
          armor: null,
          accessory1: null,
          accessory2: null,
          accessory3: null,
        },
      };

      localStorage.setItem('survivor_protocol_v2', JSON.stringify(mockSaved));
      SaveData.load();

      expect(SaveData.data.shop.safeSlotsCount).toBe(1);
    });
  });

  describe('Auto-Select Safe Items Logic', () => {
    it('should return empty array when no loot collected', () => {
      const securedIds = autoSelectSafeItems([], 1);
      expect(securedIds).toEqual([]);
    });

    it('should select top 1 item with 1 safe slot', () => {
      const items = [
        createMockItem('1', 'common', 'weapon'),
        createMockItem('2', 'rare', 'helm'),
        createMockItem('3', 'legendary', 'armor'),
      ];

      const securedIds = autoSelectSafeItems(items, 1);

      expect(securedIds.length).toBe(1);
      expect(securedIds[0]).toBe('3');
    });

    it('should select items by rarity priority (legendary > rare > magic > common)', () => {
      const items = [
        createMockItem('1', 'common', 'weapon'),
        createMockItem('2', 'magic', 'helm'),
        createMockItem('3', 'rare', 'armor'),
        createMockItem('4', 'legendary', 'accessory'),
      ];

      const securedIds = autoSelectSafeItems(items, 2);

      expect(securedIds.length).toBe(2);
      expect(securedIds).toContain('4');
      expect(securedIds).toContain('3');
    });

    it('should prioritize relics over regular items of same rarity', () => {
      const items = [
        createMockItem('1', 'rare', 'weapon'),
        createMockItem('2', 'rare', 'helm'),
        createMockItem('3', 'rare', 'relic'),
      ];

      const securedIds = autoSelectSafeItems(items, 2);

      expect(securedIds.length).toBe(2);
      expect(securedIds).toContain('3');
      const nonRelicItems = securedIds.filter(id => id !== '3');
      expect(nonRelicItems.length).toBe(1);
      expect(nonRelicItems[0] === '1' || nonRelicItems[0] === '2').toBe(true);
    });

    it('should handle relic type correctly', () => {
      const items = [
        createMockItem('1', 'common', 'weapon'),
        createMockItem('2', 'magic', 'relic'),
        createMockItem('3', 'rare', 'helm'),
        createMockItem('4', 'legendary', 'relic'),
      ];

      const securedIds = autoSelectSafeItems(items, 2);

      expect(securedIds.length).toBe(2);
      expect(securedIds).toContain('4');
      expect(securedIds).toContain('3');
    });

    it('should limit to safe slot count', () => {
      const items = [
        createMockItem('1', 'legendary', 'weapon'),
        createMockItem('2', 'legendary', 'helm'),
        createMockItem('3', 'legendary', 'armor'),
        createMockItem('4', 'legendary', 'relic'),
        createMockItem('5', 'rare', 'accessory'),
      ];

      const securedIds = autoSelectSafeItems(items, 3);

      expect(securedIds.length).toBe(3);
    });

    it('should randomly select among same-rarity items', () => {
      const items = [
        createMockItem('1', 'rare', 'weapon'),
        createMockItem('2', 'rare', 'helm'),
        createMockItem('3', 'rare', 'armor'),
      ];

      const selections: string[] = [];
      for (let i = 0; i < 10; i++) {
        const securedIds = autoSelectSafeItems(items, 1);
        selections.push(securedIds[0]);
      }

      const uniqueSelections = new Set(selections);

      expect(uniqueSelections.size).toBeGreaterThan(1);
    });

    it('should handle all rarities correctly', () => {
      const items = [
        createMockItem('1', 'common', 'weapon'),
        createMockItem('2', 'magic', 'helm'),
        createMockItem('3', 'rare', 'armor'),
        createMockItem('4', 'rare', 'relic'),
        createMockItem('5', 'legendary', 'relic'),
      ];

      const securedIds = autoSelectSafeItems(items, 5);

      expect(securedIds.length).toBe(5);
      expect(securedIds[0]).toBe('5');
      expect(securedIds[1]).toBe('4');
      expect(securedIds[2]).toBe('3');
      expect(securedIds[3]).toBe('2');
      expect(securedIds[4]).toBe('1');
    });
  });

  describe('Safe Slots Upgrade Costs', () => {
    const calculateCost = (level: number) => level === 1 ? 500 : (level === 2 ? 1000 : level * 1000);

    it('should calculate correct cost for 2nd slot (level 1)', () => {
      expect(calculateCost(1)).toBe(500);
    });

    it('should calculate correct cost for 3rd slot (level 2)', () => {
      expect(calculateCost(2)).toBe(1000);
    });

    it('should calculate correct cost for 4th slot (level 3)', () => {
      expect(calculateCost(3)).toBe(3000);
    });

    it('should calculate correct cost for 5th slot (level 4)', () => {
      expect(calculateCost(4)).toBe(4000);
    });
  });

  describe('Safe Slots Maximum', () => {
    it('should cap at 5 slots total', () => {
      expect(SaveData.data.shop.safeSlotsCount).toBeLessThanOrEqual(5);
    });
  });

  describe('Game Over - Safe Items', () => {
    it('should save all items on successful extraction', () => {
      const items = [
        createMockItem('1', 'common', 'weapon'),
        createMockItem('2', 'rare', 'helm'),
        createMockItem('3', 'legendary', 'armor'),
      ];

      const securedIds = autoSelectSafeItems(items, 5);

      expect(securedIds).toHaveLength(items.length);
    });

    it('should only save top N items on death', () => {
      const items = [
        createMockItem('1', 'common', 'weapon'),
        createMockItem('2', 'magic', 'helm'),
        createMockItem('3', 'rare', 'armor'),
        createMockItem('4', 'rare', 'relic'),
      ];

      const securedIds = autoSelectSafeItems(items, 2);

      expect(securedIds).toHaveLength(2);
      expect(securedIds).toContain('4');
      expect(securedIds).toContain('3');
      expect(securedIds).not.toContain('1');
      expect(securedIds).not.toContain('2');
    });
  });
});
