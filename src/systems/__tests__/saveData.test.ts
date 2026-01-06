import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SaveData } from '../saveData';

const createLocalStorage = (): Storage => {
  let store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
};

const createEmptyStash = () => Array.from({ length: 200 }, () => null);

const createEmptyLoadout = () => ({
  relic: null,
  weapon: null,
  helm: null,
  armor: null,
  accessory1: null,
  accessory2: null,
  accessory3: null,
});

describe('SaveData', () => {
  const STORAGE_KEY = 'survivor_protocol_v2';
  let originalLocalStorage: Storage | undefined;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    if (!originalLocalStorage || typeof originalLocalStorage.clear !== 'function') {
      globalThis.localStorage = createLocalStorage();
    }
    // Clear localStorage before each test
    localStorage.clear();
    // Reload default data
    SaveData.data = {
      gold: 0,
      ownedChars: ['wizard'],
      selectedChar: 'wizard',
      shop: { damage: 0, health: 0, speed: 0, magnet: 0 },
      stash: createEmptyStash(),
      loadout: createEmptyLoadout(),
    };
  });

  afterEach(() => {
    localStorage.clear();
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete (globalThis as any).localStorage;
    }
  });

  describe('default data', () => {
    it('should initialize with default values', () => {
      expect(SaveData.data.gold).toBe(0);
      expect(SaveData.data.ownedChars).toEqual(['wizard']);
      expect(SaveData.data.selectedChar).toBe('wizard');
      expect(SaveData.data.shop.damage).toBe(0);
      expect(SaveData.data.shop.health).toBe(0);
      expect(SaveData.data.shop.speed).toBe(0);
      expect(SaveData.data.shop.magnet).toBe(0);
      expect(SaveData.data.stash.length).toBe(200);
    });

    it('should have wizard unlocked by default', () => {
      expect(SaveData.data.ownedChars).toContain('wizard');
      expect(SaveData.data.selectedChar).toBe('wizard');
    });
  });

  describe('load', () => {
    it('should load nothing when localStorage is empty', () => {
      SaveData.load();
      expect(SaveData.data.gold).toBe(0);
      expect(SaveData.data.ownedChars).toEqual(['wizard']);
    });

    it('should load saved gold value', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ gold: 500 }));
      SaveData.load();
      expect(SaveData.data.gold).toBe(500);
    });

    it('should load saved ownedChars', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ownedChars: ['paladin', 'rogue', 'knight']
      }));
      SaveData.load();
      // wizard is always added if selectedChar is not in ownedChars
      // But here selectedChar defaults to wizard which is not in the list
      // So it gets added
      expect(SaveData.data.ownedChars).toContain('paladin');
      expect(SaveData.data.ownedChars).toContain('rogue');
      expect(SaveData.data.ownedChars).toContain('knight');
    });

    it('should load saved selectedChar', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedChar: 'paladin'
      }));
      SaveData.load();
      expect(SaveData.data.selectedChar).toBe('paladin');
    });

    it('should load saved shop upgrades', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        shop: { damage: 2, health: 1, speed: 3, magnet: 2 }
      }));
      SaveData.load();
      expect(SaveData.data.shop.damage).toBe(2);
      expect(SaveData.data.shop.health).toBe(1);
      expect(SaveData.data.shop.speed).toBe(3);
      expect(SaveData.data.shop.magnet).toBe(2);
    });

    it('should merge partial save data with defaults', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        gold: 1000,
        selectedChar: 'rogue'
      }));
      SaveData.load();
      expect(SaveData.data.gold).toBe(1000);
      expect(SaveData.data.selectedChar).toBe('rogue');
      // selectedChar 'rogue' is added to ownedChars
      expect(SaveData.data.ownedChars).toContain('wizard');
      expect(SaveData.data.ownedChars).toContain('rogue');
      expect(SaveData.data.shop.damage).toBe(0);
    });

    it('should use default ownedChars when not in save', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        gold: 100
      }));
      SaveData.load();
      expect(SaveData.data.ownedChars).toEqual(['wizard']);
    });

    it('should use default selectedChar when not in save', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        gold: 100
      }));
      SaveData.load();
      expect(SaveData.data.selectedChar).toBe('wizard');
    });

    it('should use default shop values when not in save', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        gold: 100
      }));
      SaveData.load();
      expect(SaveData.data.shop.damage).toBe(0);
      expect(SaveData.data.shop.health).toBe(0);
      expect(SaveData.data.shop.speed).toBe(0);
      expect(SaveData.data.shop.magnet).toBe(0);
    });

    it('should use default shop values when shop is null', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        gold: 100,
        shop: null
      }));
      SaveData.load();
      expect(SaveData.data.shop.damage).toBe(0);
    });

    it('should handle missing shop properties', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        shop: { damage: 2 } // Missing health, speed, magnet
      }));
      SaveData.load();
      expect(SaveData.data.shop.damage).toBe(2);
      expect(SaveData.data.shop.health).toBe(0);
      expect(SaveData.data.shop.speed).toBe(0);
      expect(SaveData.data.shop.magnet).toBe(0);
    });

    it('should add selectedChar to ownedChars if not present', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ownedChars: ['paladin'],
        selectedChar: 'rogue'
      }));
      SaveData.load();
      expect(SaveData.data.ownedChars).toContain('rogue');
    });

    it('should not duplicate selectedChar in ownedChars', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ownedChars: ['paladin', 'rogue'],
        selectedChar: 'rogue'
      }));
      SaveData.load();
      const count = SaveData.data.ownedChars.filter(c => c === 'rogue').length;
      expect(count).toBe(1);
    });

    it('should handle malformed JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');
      expect(() => SaveData.load()).not.toThrow();
      // Should keep defaults
      expect(SaveData.data.gold).toBe(0);
    });

    it('should handle JSON parse errors', () => {
      localStorage.setItem(STORAGE_KEY, '{invalid}');
      expect(() => SaveData.load()).not.toThrow();
    });

    it('should migrate old character IDs to new fantasy-themed IDs', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ownedChars: ['dungeonMaster', 'janitor', 'skater'],
        selectedChar: 'dungeonMaster'
      }));
      SaveData.load();
      expect(SaveData.data.ownedChars).toContain('wizard');
      expect(SaveData.data.ownedChars).toContain('paladin');
      expect(SaveData.data.ownedChars).toContain('rogue');
      expect(SaveData.data.selectedChar).toBe('wizard');
    });

    it('should migrate single old character ID', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ownedChars: ['mallCop'],
        selectedChar: 'mallCop'
      }));
      SaveData.load();
      expect(SaveData.data.ownedChars).toContain('knight');
      expect(SaveData.data.selectedChar).toBe('knight');
    });

    it('should migrate all old character IDs', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ownedChars: ['dungeonMaster', 'janitor', 'skater', 'mallCop', 'foodCourt', 'teenager'],
        selectedChar: 'teenager'
      }));
      SaveData.load();
      expect(SaveData.data.ownedChars).toEqual(['wizard', 'paladin', 'rogue', 'knight', 'berserker', 'pyromancer']);
      expect(SaveData.data.selectedChar).toBe('pyromancer');
    });
  });

  describe('save', () => {
    it('should save data to localStorage', () => {
      SaveData.data.gold = 500;
      SaveData.save();
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.gold).toBe(500);
    });

    it('should save all data properties', () => {
      SaveData.data = {
        gold: 1000,
        ownedChars: ['paladin', 'rogue'],
        selectedChar: 'paladin',
        shop: { damage: 3, health: 2, speed: 1, magnet: 1 },
        stash: createEmptyStash(),
        loadout: createEmptyLoadout(),
      };
      SaveData.save();
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(SaveData.data);
    });

    it('should overwrite existing save data', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ gold: 999 }));
      SaveData.data.gold = 500;
      SaveData.save();
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed.gold).toBe(500);
    });

    it('should save empty ownedChars array', () => {
      SaveData.data.ownedChars = [];
      SaveData.save();
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed.ownedChars).toEqual([]);
    });
  });

  describe('save/load round-trip', () => {
    it('should preserve data through save/load cycle', () => {
      const originalData = {
        gold: 2500,
        ownedChars: ['paladin', 'rogue', 'knight', 'berserker'],
        selectedChar: 'knight',
        shop: { damage: 5, health: 3, speed: 2, magnet: 4 },
        stash: createEmptyStash(),
        loadout: createEmptyLoadout(),
      };

      SaveData.data = originalData;
      SaveData.save();

      // Reset and reload
      SaveData.data = {
        gold: 0,
        ownedChars: ['wizard'],
        selectedChar: 'wizard',
        shop: { damage: 0, health: 0, speed: 0, magnet: 0 },
        stash: createEmptyStash(),
        loadout: createEmptyLoadout(),
      };
      SaveData.load();

      expect(SaveData.data.gold).toBe(originalData.gold);
      expect(SaveData.data.ownedChars).toEqual(originalData.ownedChars);
      expect(SaveData.data.selectedChar).toBe(originalData.selectedChar);
      expect(SaveData.data.shop).toEqual(originalData.shop);
    });

    it('should handle new characters in future versions', () => {
      // Save with current characters
      SaveData.data = {
        gold: 100,
        ownedChars: ['paladin'],
        selectedChar: 'paladin',
        shop: { damage: 1, health: 0, speed: 0, magnet: 0 },
        stash: createEmptyStash(),
        loadout: createEmptyLoadout(),
      };
      SaveData.save();

      // Simulate adding a new property to the save
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      saved.newProperty = 'someValue';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

      // Load should not error on new property
      expect(() => SaveData.load()).not.toThrow();
    });
  });

  describe('shop upgrades', () => {
    it('should handle maxed shop upgrades', () => {
      SaveData.data = {
        gold: 10000,
        ownedChars: ['wizard'],
        selectedChar: 'wizard',
        shop: { damage: 5, health: 5, speed: 3, magnet: 3 },
        stash: createEmptyStash(),
        loadout: createEmptyLoadout(),
      };
      SaveData.save();
      SaveData.load();

      expect(SaveData.data.shop.damage).toBe(5);
      expect(SaveData.data.shop.health).toBe(5);
      expect(SaveData.data.shop.speed).toBe(3);
      expect(SaveData.data.shop.magnet).toBe(3);
    });

    it('should handle zero shop upgrades', () => {
      SaveData.data = {
        gold: 0,
        ownedChars: ['wizard'],
        selectedChar: 'wizard',
        shop: { damage: 0, health: 0, speed: 0, magnet: 0 },
        stash: createEmptyStash(),
        loadout: createEmptyLoadout(),
      };
      SaveData.save();
      SaveData.load();

      expect(SaveData.data.shop.damage).toBe(0);
      expect(SaveData.data.shop.health).toBe(0);
      expect(SaveData.data.shop.speed).toBe(0);
      expect(SaveData.data.shop.magnet).toBe(0);
    });
  });

  describe('data mutation', () => {
    it('should allow modifying gold', () => {
      SaveData.data.gold = 100;
      expect(SaveData.data.gold).toBe(100);
    });

    it('should allow modifying ownedChars', () => {
      SaveData.data.ownedChars.push('paladin');
      expect(SaveData.data.ownedChars).toContain('paladin');
    });

    it('should allow modifying selectedChar', () => {
      SaveData.data.selectedChar = 'rogue';
      expect(SaveData.data.selectedChar).toBe('rogue');
    });

    it('should allow modifying shop upgrades', () => {
      SaveData.data.shop.damage = 3;
      expect(SaveData.data.shop.damage).toBe(3);
    });
  });

  describe('singleton behavior', () => {
    it('should maintain same instance across imports', () => {
      // Import again (simulated - in real scenario would be actual import)
      // Since we're testing the same module, we just verify the instance
      expect(SaveData).toBeDefined();
      expect(SaveData.data).toBeDefined();
    });
  });
});
