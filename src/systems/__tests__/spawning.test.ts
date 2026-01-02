import { describe, it, expect } from 'vitest';
import {
  getSpawnInterval,
  shouldSpawnElite,
  shouldSpawnBoss,
  determineEnemyType,
  calculateSpawn,
  isSpawnAllowed,
  type SpawnState,
} from '../spawning';

describe('spawning', () => {
  describe('getSpawnInterval', () => {
    it('should start at 60 frames at minute 0', () => {
      expect(getSpawnInterval(0)).toBe(60);
    });

    it('should decrease by 5 per minute', () => {
      expect(getSpawnInterval(1)).toBe(55);
      expect(getSpawnInterval(2)).toBe(50);
      expect(getSpawnInterval(5)).toBe(35);
    });

    it('should have minimum of 10 frames', () => {
      expect(getSpawnInterval(10)).toBe(10);
      expect(getSpawnInterval(11)).toBe(10);
      expect(getSpawnInterval(20)).toBe(10);
      expect(getSpawnInterval(100)).toBe(10);
    });

    it('should reach minimum at minute 10', () => {
      // 60 - 10 * 5 = 10
      expect(getSpawnInterval(10)).toBe(10);
    });
  });

  describe('shouldSpawnElite', () => {
    it('should return false at time 0', () => {
      expect(shouldSpawnElite(0)).toBe(false);
    });

    it('should return true at 60 seconds', () => {
      expect(shouldSpawnElite(60)).toBe(true);
    });

    it('should return true at 120, 180, 240 seconds', () => {
      expect(shouldSpawnElite(120)).toBe(true);
      expect(shouldSpawnElite(180)).toBe(true);
      expect(shouldSpawnElite(240)).toBe(true);
    });

    it('should return false at non-multiples of 60', () => {
      expect(shouldSpawnElite(30)).toBe(false);
      expect(shouldSpawnElite(61)).toBe(false);
      expect(shouldSpawnElite(119)).toBe(false);
    });
  });

  describe('shouldSpawnBoss', () => {
    it('should return false at time 0', () => {
      expect(shouldSpawnBoss(0)).toBe(false);
    });

    it('should return true at 300 seconds (5 minutes)', () => {
      expect(shouldSpawnBoss(300)).toBe(true);
    });

    it('should return true at 600, 900 seconds', () => {
      expect(shouldSpawnBoss(600)).toBe(true);
      expect(shouldSpawnBoss(900)).toBe(true);
    });

    it('should return false at non-multiples of 300', () => {
      expect(shouldSpawnBoss(60)).toBe(false);
      expect(shouldSpawnBoss(150)).toBe(false);
      expect(shouldSpawnBoss(299)).toBe(false);
      expect(shouldSpawnBoss(301)).toBe(false);
    });
  });

  describe('determineEnemyType', () => {
    it('should return boss at 300 seconds', () => {
      expect(determineEnemyType(300, 0.5)).toBe('boss');
    });

    it('should return elite at 60 seconds', () => {
      expect(determineEnemyType(60, 0.5)).toBe('elite');
    });

    it('should return bat when random > 0.9', () => {
      expect(determineEnemyType(30, 0.91)).toBe('bat');
      expect(determineEnemyType(30, 0.99)).toBe('bat');
    });

    it('should return basic when random <= 0.9', () => {
      expect(determineEnemyType(30, 0.9)).toBe('basic');
      expect(determineEnemyType(30, 0.5)).toBe('basic');
      expect(determineEnemyType(30, 0)).toBe('basic');
    });

    it('should prioritize boss over other types', () => {
      // At 300s, boss spawns regardless of random value
      expect(determineEnemyType(300, 0.99)).toBe('boss');
      expect(determineEnemyType(300, 0)).toBe('boss');
    });

    it('should prioritize elite over bat/basic', () => {
      // At 60s, elite spawns regardless of random value
      expect(determineEnemyType(60, 0.99)).toBe('elite');
      expect(determineEnemyType(60, 0)).toBe('elite');
    });

    it('should use random value when no special spawn', () => {
      expect(determineEnemyType(30, 0.95)).toBe('bat');
      expect(determineEnemyType(30, 0.85)).toBe('basic');
    });
  });

  describe('calculateSpawn', () => {
    const baseState: SpawnState = {
      frames: 0,
      time: 0,
      mins: 0,
      timeFreeze: 0,
      hasExistingBoss: false,
    };

    it('should not spawn when time is frozen', () => {
      const state = { ...baseState, frames: 0, timeFreeze: 10 };
      expect(calculateSpawn(state).shouldSpawn).toBe(false);
    });

    it('should not spawn on non-interval frames', () => {
      const state = { ...baseState, frames: 1 };
      expect(calculateSpawn(state).shouldSpawn).toBe(false);
    });

    it('should spawn on interval frames', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const state = { ...baseState, frames: 0 };
      const result = calculateSpawn(state);
      expect(result.shouldSpawn).toBe(true);
      expect(result.type).toBe('basic');
      mockRandom.mockRestore();
    });

    it('should return correct type at elite time', () => {
      const state = { ...baseState, frames: 0, time: 60 };
      const result = calculateSpawn(state);
      expect(result.shouldSpawn).toBe(true);
      expect(result.type).toBe('elite');
    });

    it('should return correct type at boss time', () => {
      const state = { ...baseState, frames: 0, time: 300 };
      const result = calculateSpawn(state);
      expect(result.shouldSpawn).toBe(true);
      expect(result.type).toBe('boss');
    });

    it('should not spawn boss when one exists', () => {
      const state = { ...baseState, frames: 0, time: 300, hasExistingBoss: true };
      const result = calculateSpawn(state);
      expect(result.shouldSpawn).toBe(false);
      expect(result.type).toBeUndefined();
    });

    it('should allow elite when boss exists', () => {
      const state = { ...baseState, frames: 0, time: 60, hasExistingBoss: true };
      const result = calculateSpawn(state);
      expect(result.shouldSpawn).toBe(true);
      expect(result.type).toBe('elite');
    });

    it('should use faster intervals at higher minutes', () => {
      let state5mins = { ...baseState, mins: 5 };
      // At 5 mins, interval is 35 frames
      expect(calculateSpawn({ ...state5mins, frames: 0 }).shouldSpawn).toBe(true);
      expect(calculateSpawn({ ...state5mins, frames: 1 }).shouldSpawn).toBe(false);
      expect(calculateSpawn({ ...state5mins, frames: 35 }).shouldSpawn).toBe(true);

      let state10mins = { ...baseState, mins: 10 };
      // At 10 mins, interval is 10 frames (minimum)
      expect(calculateSpawn({ ...state10mins, frames: 0 }).shouldSpawn).toBe(true);
      expect(calculateSpawn({ ...state10mins, frames: 10 }).shouldSpawn).toBe(true);
      expect(calculateSpawn({ ...state10mins, frames: 20 }).shouldSpawn).toBe(true);
    });

    it('should handle minimum spawn interval', () => {
      const state = { ...baseState, mins: 15 };
      expect(calculateSpawn({ ...state, frames: 0 }).shouldSpawn).toBe(true);
      expect(calculateSpawn({ ...state, frames: 10 }).shouldSpawn).toBe(true);
      expect(calculateSpawn({ ...state, frames: 1 }).shouldSpawn).toBe(false);
    });
  });

  describe('isSpawnAllowed', () => {
    it('should allow basic when boss exists', () => {
      expect(isSpawnAllowed('basic', true)).toBe(true);
    });

    it('should allow bat when boss exists', () => {
      expect(isSpawnAllowed('bat', true)).toBe(true);
    });

    it('should allow elite when boss exists', () => {
      expect(isSpawnAllowed('elite', true)).toBe(true);
    });

    it('should not allow boss when boss exists', () => {
      expect(isSpawnAllowed('boss', true)).toBe(false);
    });

    it('should allow boss when no boss exists', () => {
      expect(isSpawnAllowed('boss', false)).toBe(true);
    });

    it('should allow all types when no boss exists', () => {
      expect(isSpawnAllowed('basic', false)).toBe(true);
      expect(isSpawnAllowed('bat', false)).toBe(true);
      expect(isSpawnAllowed('elite', false)).toBe(true);
      expect(isSpawnAllowed('boss', false)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle time = 0 correctly', () => {
      const state: SpawnState = {
        frames: 0,
        time: 0,
        mins: 0,
        timeFreeze: 0,
        hasExistingBoss: false,
      };
      const result = calculateSpawn(state);
      expect(result.shouldSpawn).toBe(true);
      // At time 0, can be basic or bat (10% chance) depending on Math.random()
      expect(['basic', 'bat']).toContain(result.type);
    });

    it('should handle very large time values', () => {
      const state: SpawnState = {
        frames: 0,
        time: 3600, // 1 hour
        mins: 60,
        timeFreeze: 0,
        hasExistingBoss: false,
      };
      const result = calculateSpawn(state);
      // 3600 % 300 = 0, so boss
      expect(result.shouldSpawn).toBe(true);
      expect(result.type).toBe('boss');
    });

    it('should handle time exactly between elite spawns', () => {
      const state: SpawnState = {
        frames: 0,
        time: 90, // Between 60 and 120
        mins: 1,
        timeFreeze: 0,
        hasExistingBoss: false,
      };
      const result = calculateSpawn(state);
      expect(result.shouldSpawn).toBe(true);
      expect(['basic', 'bat']).toContain(result.type);
    });

    it('should handle negative time freeze (edge case)', () => {
      const state: SpawnState = {
        frames: 0,
        time: 0,
        mins: 0,
        timeFreeze: -1,
        hasExistingBoss: false,
      };
      // Negative timeFreeze should still allow spawning (treated as not frozen)
      expect(calculateSpawn(state).shouldSpawn).toBe(true);
    });

    it('should handle zero minutes with maximum time', () => {
      // Edge case: time might increment before mins does
      const state: SpawnState = {
        frames: 0,
        time: 59,
        mins: 0,
        timeFreeze: 0,
        hasExistingBoss: false,
      };
      const result = calculateSpawn(state);
      expect(result.shouldSpawn).toBe(true);
      expect(result.type).not.toBe('elite'); // 59 % 60 !== 0
    });
  });
});
