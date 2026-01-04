import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Debug } from '../debug';
import { SaveData } from '../saveData';
import { CHARACTERS } from '../../data/characters';
import { CONFIG } from '../../config';
import { Game } from '../../game';

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
    paladin: { name: 'Janitor' },
    rogue: { name: 'Skater' },
    knight: { name: 'Mall Cop' },
  },
}));

// Mock Game
vi.mock('../../game', () => ({
  Game: {
    player: null,
    enemies: [],
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
      expect(SaveData.data.ownedChars).toEqual(['paladin', 'rogue', 'knight']);
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
      expect(localStorage.removeItem).toHaveBeenCalledWith('survivor_protocol_v2');
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

  describe('World Wrapping - Teleport Tests', () => {
    beforeEach(() => {
      // Set up a mock player
      (Game as any).player = { x: 1000, y: 1000 };
      (Game as any).enemies = [];
    });

    describe('teleport', () => {
      it('should teleport player to given position', () => {
        Debug.teleport(500, 500);
        expect((Game as any).player.x).toBe(500);
        expect((Game as any).player.y).toBe(500);
      });

      it('should wrap positions beyond world size', () => {
        Debug.teleport(CONFIG.worldSize + 100, CONFIG.worldSize + 200);
        expect((Game as any).player.x).toBe(100);
        expect((Game as any).player.y).toBe(200);
      });

      it('should wrap negative positions', () => {
        Debug.teleport(-100, -200);
        expect((Game as any).player.x).toBe(CONFIG.worldSize - 100);
        expect((Game as any).player.y).toBe(CONFIG.worldSize - 200);
      });

      it('should handle multiple wraps', () => {
        Debug.teleport(CONFIG.worldSize * 3 + 250, CONFIG.worldSize * 2 - 100);
        expect((Game as any).player.x).toBe(250);
        expect((Game as any).player.y).toBe(CONFIG.worldSize - 100);
      });
    });

    describe('edge teleport helpers', () => {
      it('teleportToLeftEdge should place player near left edge', () => {
        Debug.teleportToLeftEdge();
        expect((Game as any).player.x).toBe(50);
        expect((Game as any).player.y).toBe(CONFIG.worldSize / 2);
      });

      it('teleportToRightEdge should place player near right edge', () => {
        Debug.teleportToRightEdge();
        expect((Game as any).player.x).toBe(CONFIG.worldSize - 50);
        expect((Game as any).player.y).toBe(CONFIG.worldSize / 2);
      });

      it('teleportToTopEdge should place player near top edge', () => {
        Debug.teleportToTopEdge();
        expect((Game as any).player.x).toBe(CONFIG.worldSize / 2);
        expect((Game as any).player.y).toBe(50);
      });

      it('teleportToBottomEdge should place player near bottom edge', () => {
        Debug.teleportToBottomEdge();
        expect((Game as any).player.x).toBe(CONFIG.worldSize / 2);
        expect((Game as any).player.y).toBe(CONFIG.worldSize - 50);
      });

      it('teleportToCenter should place player in center', () => {
        Debug.teleportToCenter();
        expect((Game as any).player.x).toBe(CONFIG.worldSize / 2);
        expect((Game as any).player.y).toBe(CONFIG.worldSize / 2);
      });
    });

    describe('printPositionInfo', () => {
      it('should log player info when player exists', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        Debug.printPositionInfo();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Player:')
        );
        consoleSpy.mockRestore();
      });

      it('should log no player message when player does not exist', () => {
        (Game as any).player = null;
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        Debug.printPositionInfo();
        expect(consoleSpy).toHaveBeenCalledWith('No active player');
        consoleSpy.mockRestore();
      });
    });
  });
});
