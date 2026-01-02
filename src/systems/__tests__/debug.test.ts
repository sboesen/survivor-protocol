import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Debug } from '../debug';
import { SaveData } from '../saveData';
import { CHARACTERS } from '../../data/characters';

// Mock SaveData
vi.mock('../saveData', () => ({
  SaveData: {
    data: {
      gold: 0,
      ownedChars: [],
    },
    save: vi.fn(),
  },
}));

// Mock CHARACTERS
vi.mock('../../data/characters', () => ({
  CHARACTERS: {
    janitor: { name: 'Janitor' },
    skater: { name: 'Skater' },
    mallCop: { name: 'Mall Cop' },
  },
}));

describe('Debug', () => {
  let mockGachaGold: HTMLElement;
  let mockShopGold: HTMLElement;

  beforeEach(() => {
    // Reset SaveData mock
    (SaveData.data as any).gold = 100;
    (SaveData.data as any).ownedChars = [];

    // Reset DOM mocks
    mockGachaGold = {
      textContent: '0',
    } as any;
    mockShopGold = {
      textContent: '0',
    } as any;

    vi.stubGlobal('document', {
      getElementById: vi.fn((id: string) => {
        if (id === 'gacha-gold') return mockGachaGold;
        if (id === 'shop-gold-display') return mockShopGold;
        return null;
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('addGold', () => {
    beforeEach(() => {
      (SaveData.data as any).gold = 100;
    });

    it('should add gold to SaveData', () => {
      Debug.addGold(50);
      expect(SaveData.data.gold).toBe(150);
    });

    it('should save after adding gold', () => {
      Debug.addGold(25);
      expect(SaveData.save).toHaveBeenCalled();
    });

    it('should update gacha-gold element', () => {
      Debug.addGold(75);
      expect(mockGachaGold.textContent).toBe('175');
    });

    it('should update shop-gold-display element', () => {
      Debug.addGold(75);
      expect(mockShopGold.textContent).toBe('175');
    });

    it('should handle negative amounts', () => {
      Debug.addGold(-50);
      expect(SaveData.data.gold).toBe(50);
    });

    it('should handle missing gacha-gold element', () => {
      vi.stubGlobal('document', {
        getElementById: vi.fn(() => null),
      });

      expect(() => Debug.addGold(25)).not.toThrow();
      expect(SaveData.data.gold).toBe(125);
    });

    it('should handle missing shop-gold-display element', () => {
      const mockOnlyGacha = {
        getElementById: vi.fn((id: string) => {
          if (id === 'gacha-gold') return mockGachaGold;
          return null;
        }),
      };
      vi.stubGlobal('document', mockOnlyGacha);

      expect(() => Debug.addGold(25)).not.toThrow();
      expect(SaveData.data.gold).toBe(125);
    });
  });

  describe('unlockAll', () => {
    beforeEach(() => {
      (SaveData.data as any).ownedChars = [];
    });

    it('should unlock all characters', () => {
      Debug.unlockAll();
      expect(SaveData.data.ownedChars).toEqual(['janitor', 'skater', 'mallCop']);
    });

    it('should save after unlocking', () => {
      Debug.unlockAll();
      expect(SaveData.save).toHaveBeenCalled();
    });
  });

  describe('resetProgress', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        removeItem: vi.fn(),
      });
      vi.stubGlobal('location', {
        reload: vi.fn(),
      });
      // Mock confirm to return true (user confirms)
      vi.stubGlobal('confirm', vi.fn(() => true));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should show confirmation dialog', () => {
      Debug.resetProgress();
      expect(confirm).toHaveBeenCalledWith('THIS WILL ERASE EVERYTHING! Continue?');
    });

    it('should remove localStorage item when confirmed', () => {
      Debug.resetProgress();
      expect(localStorage.removeItem).toHaveBeenCalledWith('survivor_proto_v2_3');
    });

    it('should reload the page when confirmed', () => {
      Debug.resetProgress();
      expect(location.reload).toHaveBeenCalled();
    });

    it('should not remove localStorage when cancelled', () => {
      vi.stubGlobal('confirm', vi.fn(() => false));

      Debug.resetProgress();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
      expect(location.reload).not.toHaveBeenCalled();
    });
  });
});
