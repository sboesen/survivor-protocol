import { describe, it, expect, vi } from 'vitest';
import { selectUpgradeChoices, calculateChoiceCount } from '../levelUp';

describe('levelUp', () => {
  describe('selectUpgradeChoices', () => {
    it('should return empty array for empty pool', () => {
      const result = selectUpgradeChoices([], 3);
      expect(result).toEqual([]);
    });

    it('should return all items when pool is smaller than count', () => {
      const pool = ['a', 'b'];
      const result = selectUpgradeChoices(pool, 5);
      expect(result).toHaveLength(2);
      expect(result).toContain('a');
      expect(result).toContain('b');
    });

    it('should return exactly count items when pool is large enough', () => {
      const pool = ['a', 'b', 'c', 'd', 'e'];
      const result = selectUpgradeChoices(pool, 3);
      expect(result).toHaveLength(3);
    });

    it('should return unique items (no duplicates)', () => {
      const pool = ['a', 'b', 'c', 'd', 'e'];
      const result = selectUpgradeChoices(pool, 3);
      const unique = new Set(result);
      expect(unique.size).toBe(result.length);
    });

    it('should use default count of 3', () => {
      const pool = ['a', 'b', 'c', 'd', 'e'];
      const result = selectUpgradeChoices(pool);
      expect(result).toHaveLength(3);
    });

    it('should handle count of 1', () => {
      const pool = ['a', 'b', 'c'];
      const result = selectUpgradeChoices(pool, 1);
      expect(result).toHaveLength(1);
    });

    it('should handle count of 0', () => {
      const pool = ['a', 'b', 'c'];
      const result = selectUpgradeChoices(pool, 0);
      expect(result).toHaveLength(0);
    });

    it('should use provided random function for deterministic testing', () => {
      const pool = ['a', 'b', 'c', 'd', 'e'];
      // Mock random to return 0.1, 0.3, 0.5 (selects indices 0, 1, 2)
      let callCount = 0;
      const mockRandom = vi.fn(() => [0.1, 0.3, 0.5][callCount++]);
      const result = selectUpgradeChoices(pool, 3, mockRandom);

      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle single-item pool', () => {
      const pool = ['only'];
      const result = selectUpgradeChoices(pool, 3);
      expect(result).toEqual(['only']);
    });

    it('should handle two-item pool with count 2', () => {
      const pool = ['a', 'b'];
      const result = selectUpgradeChoices(pool, 2);
      expect(result).toHaveLength(2);
      expect(result).toContain('a');
      expect(result).toContain('b');
    });

    it('should handle pool with special characters in names', () => {
      const pool = ['item-with-dash', 'item_with_underscore', 'item.with.dot'];
      const result = selectUpgradeChoices(pool, 2);
      expect(result).toHaveLength(2);
      expect(new Set(result).size).toBe(2);
    });

    it('should handle large pool', () => {
      const pool = Array.from({ length: 50 }, (_, i) => `item_${i}`);
      const result = selectUpgradeChoices(pool, 3);
      expect(result).toHaveLength(3);
      expect(new Set(result).size).toBe(3);
    });
  });

  describe('calculateChoiceCount', () => {
    it('should return 3 when inventory is empty', () => {
      expect(calculateChoiceCount(0)).toBe(3);
    });

    it('should return 3 when inventory has 1 item', () => {
      expect(calculateChoiceCount(1)).toBe(3);
    });

    it('should return 3 when inventory has 2 items', () => {
      expect(calculateChoiceCount(2)).toBe(3);
    });

    it('should return 3 when inventory has 3 items', () => {
      expect(calculateChoiceCount(3)).toBe(3);
    });

    it('should return 2 when inventory has 4 items', () => {
      expect(calculateChoiceCount(4)).toBe(2);
    });

    it('should return 1 when inventory has 5 items', () => {
      expect(calculateChoiceCount(5)).toBe(1);
    });

    it('should return 1 when inventory is full (6 items)', () => {
      expect(calculateChoiceCount(6)).toBe(1);
    });

    it('should return 1 when inventory is over full', () => {
      expect(calculateChoiceCount(7)).toBe(1);
      expect(calculateChoiceCount(10)).toBe(1);
    });

    it('should respect custom maxChoices', () => {
      expect(calculateChoiceCount(0, 5)).toBe(5);
      expect(calculateChoiceCount(4, 5)).toBe(2);
    });

    it('should handle negative inventory size', () => {
      // remainingSpace = 6 - (-1) = 7, min(3, max(1, 7)) = min(3, 7) = 3
      expect(calculateChoiceCount(-1)).toBe(3);
    });

    it('should return minimum 1 choice even with very large inventory', () => {
      expect(calculateChoiceCount(100)).toBe(1);
    });
  });
});
