import { describe, it, expect } from 'vitest';
import {
  calculateGameOverRewards,
  calculateSurvivalBonus,
  calculateKillBonus,
  calculateBossBonus,
  calculateTotalGold,
  type GameStats,
} from '../scoring';

describe('scoring', () => {
  describe('calculateSurvivalBonus', () => {
    it('should return 0 when no gold collected', () => {
      expect(calculateSurvivalBonus(0, 5)).toBe(0);
    });

    it('should return 0 when no time survived', () => {
      expect(calculateSurvivalBonus(100, 0)).toBe(0);
    });

    it('should calculate 20% per minute', () => {
      // 100 gold * 1 minute * 0.2 = 20
      expect(calculateSurvivalBonus(100, 1)).toBe(20);
    });

    it('should scale linearly with minutes', () => {
      // 100 gold * 2 minutes * 0.2 = 40
      expect(calculateSurvivalBonus(100, 2)).toBe(40);
      // 100 gold * 5 minutes * 0.2 = 100
      expect(calculateSurvivalBonus(100, 5)).toBe(100);
    });

    it('should scale linearly with gold', () => {
      // 200 gold * 1 minute * 0.2 = 40
      expect(calculateSurvivalBonus(200, 1)).toBe(40);
      // 500 gold * 1 minute * 0.2 = 100
      expect(calculateSurvivalBonus(500, 1)).toBe(100);
    });

    it('should floor the result', () => {
      // 99 * 1 * 0.2 = 19.8, floored to 19
      expect(calculateSurvivalBonus(99, 1)).toBe(19);
    });

    it('should handle large values', () => {
      // 1000 gold * 10 minutes * 0.2 = 2000
      expect(calculateSurvivalBonus(1000, 10)).toBe(2000);
    });

    it('should handle decimal results correctly', () => {
      // 15 * 3 * 0.2 = 9
      expect(calculateSurvivalBonus(15, 3)).toBe(9);
    });
  });

  describe('calculateKillBonus', () => {
    it('should return 0 when no kills', () => {
      expect(calculateKillBonus(0)).toBe(0);
    });

    it('should return 0 for less than 100 kills', () => {
      expect(calculateKillBonus(99)).toBe(0);
      expect(calculateKillBonus(1)).toBe(0);
      expect(calculateKillBonus(50)).toBe(0);
    });

    it('should return 50 for exactly 100 kills', () => {
      expect(calculateKillBonus(100)).toBe(50);
    });

    it('should return 50 for 101-199 kills', () => {
      expect(calculateKillBonus(101)).toBe(50);
      expect(calculateKillBonus(150)).toBe(50);
      expect(calculateKillBonus(199)).toBe(50);
    });

    it('should return 100 for 200 kills', () => {
      expect(calculateKillBonus(200)).toBe(100);
    });

    it('should scale by 50 per 100 kills', () => {
      expect(calculateKillBonus(500)).toBe(250); // 5 * 50
      expect(calculateKillBonus(1000)).toBe(500); // 10 * 50
    });

    it('should handle large kill counts', () => {
      expect(calculateKillBonus(10000)).toBe(5000); // 100 * 50
    });
  });

  describe('calculateBossBonus', () => {
    it('should return 0 when no bosses killed', () => {
      expect(calculateBossBonus(0)).toBe(0);
    });

    it('should return 200 per boss', () => {
      expect(calculateBossBonus(1)).toBe(200);
      expect(calculateBossBonus(2)).toBe(400);
      expect(calculateBossBonus(5)).toBe(1000);
    });

    it('should scale linearly', () => {
      expect(calculateBossBonus(10)).toBe(2000);
      expect(calculateBossBonus(20)).toBe(4000);
    });
  });

  describe('calculateGameOverRewards', () => {
    const defaultStats: GameStats = {
      goldRun: 100,
      mins: 2,
      kills: 50,
      bossKills: 1,
    };

    it('should calculate all bonuses', () => {
      const result = calculateGameOverRewards(defaultStats);

      expect(result.survivalBonus).toBe(40); // 100 * 2 * 0.2 = 40
      expect(result.killBonus).toBe(0); // 50 < 100 = 0
      expect(result.bossBonus).toBe(200); // 1 * 200 = 200
    });

    it('should calculate total correctly', () => {
      const result = calculateGameOverRewards(defaultStats);

      // 100 + 40 + 0 + 200 = 340
      expect(result.total).toBe(340);
    });

    it('should handle zero stats', () => {
      const result = calculateGameOverRewards({
        goldRun: 0,
        mins: 0,
        kills: 0,
        bossKills: 0,
      });

      expect(result.survivalBonus).toBe(0);
      expect(result.killBonus).toBe(0);
      expect(result.bossBonus).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle a perfect run', () => {
      const result = calculateGameOverRewards({
        goldRun: 1000,
        mins: 10,
        kills: 500,
        bossKills: 10,
      });

      expect(result.survivalBonus).toBe(2000); // 1000 * 10 * 0.2
      expect(result.killBonus).toBe(250); // 500 // 100 * 50
      expect(result.bossBonus).toBe(2000); // 10 * 200
      expect(result.total).toBe(5250); // 1000 + 2000 + 250 + 2000
    });

    it('should handle early death', () => {
      const result = calculateGameOverRewards({
        goldRun: 10,
        mins: 0,
        kills: 5,
        bossKills: 0,
      });

      expect(result.survivalBonus).toBe(0); // 0 mins
      expect(result.killBonus).toBe(0); // < 100 kills
      expect(result.bossBonus).toBe(0);
      expect(result.total).toBe(10); // just goldRun
    });

    it('should handle kill-focused run', () => {
      const result = calculateGameOverRewards({
        goldRun: 50,
        mins: 1,
        kills: 300,
        bossKills: 0,
      });

      expect(result.survivalBonus).toBe(10); // 50 * 1 * 0.2
      expect(result.killBonus).toBe(150); // 300 // 100 * 50
      expect(result.bossBonus).toBe(0);
      expect(result.total).toBe(210); // 50 + 10 + 150
    });

    it('should handle boss-focused run', () => {
      const result = calculateGameOverRewards({
        goldRun: 50,
        mins: 1,
        kills: 10,
        bossKills: 3,
      });

      expect(result.survivalBonus).toBe(10); // 50 * 1 * 0.2
      expect(result.killBonus).toBe(0);
      expect(result.bossBonus).toBe(600); // 3 * 200
      expect(result.total).toBe(660); // 50 + 10 + 0 + 600
    });

    it('should handle high gold low time run', () => {
      const result = calculateGameOverRewards({
        goldRun: 500,
        mins: 1,
        kills: 10,
        bossKills: 0,
      });

      expect(result.survivalBonus).toBe(100); // 500 * 1 * 0.2
      expect(result.killBonus).toBe(0);
      expect(result.bossBonus).toBe(0);
      expect(result.total).toBe(600); // 500 + 100
    });
  });

  describe('calculateTotalGold', () => {
    it('should return total gold including bonuses', () => {
      const stats: GameStats = {
        goldRun: 100,
        mins: 5,
        kills: 200,
        bossKills: 2,
      };

      // 100 + (100*5*0.2=100) + (200//100*50=100) + (2*200=400) = 700
      expect(calculateTotalGold(stats)).toBe(700);
    });

    it('should return goldRun when no bonuses', () => {
      const stats: GameStats = {
        goldRun: 250,
        mins: 0,
        kills: 50,
        bossKills: 0,
      };

      expect(calculateTotalGold(stats)).toBe(250);
    });
  });

  describe('edge cases', () => {
    it('should handle negative goldRun (defensive)', () => {
      const result = calculateGameOverRewards({
        goldRun: -100,
        mins: 1,
        kills: 0,
        bossKills: 0,
      });

      // -100 * 1 * 0.2 = -20, floored
      expect(result.survivalBonus).toBe(-20);
      expect(result.total).toBe(-120);
    });

    it('should handle very large values', () => {
      const result = calculateGameOverRewards({
        goldRun: 1000000,
        mins: 100,
        kills: 100000,
        bossKills: 1000,
      });

      expect(result.survivalBonus).toBe(20000000); // 1M * 100 * 0.2
      expect(result.killBonus).toBe(50000); // 100000 // 100 * 50
      expect(result.bossBonus).toBe(200000); // 1000 * 200
      expect(result.total).toBe(21250000); // 1M + 20M + 50k + 200k
    });
  });
});
