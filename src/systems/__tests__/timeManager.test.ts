import { describe, it, expect } from 'vitest';
import {
  shouldAdvanceTime,
  calculateGameTime,
  calculateMinutes,
  calculateTimeState,
  calculateUltCharge,
  decrementTimeFreeze,
  decrementUltActiveTime,
  shouldTriggerAuraAttack,
  shouldUpdateHud,
  shouldTriggerFountainHeal,
} from '../timeManager';

describe('timeManager', () => {
  describe('shouldAdvanceTime', () => {
    it('should return true at frame 0', () => {
      expect(shouldAdvanceTime(0)).toBe(true);
    });

    it('should return true at frame 60', () => {
      expect(shouldAdvanceTime(60)).toBe(true);
    });

    it('should return true at frame 120', () => {
      expect(shouldAdvanceTime(120)).toBe(true);
    });

    it('should return false at non-multiples of 60', () => {
      expect(shouldAdvanceTime(1)).toBe(false);
      expect(shouldAdvanceTime(30)).toBe(false);
      expect(shouldAdvanceTime(59)).toBe(false);
      expect(shouldAdvanceTime(61)).toBe(false);
    });
  });

  describe('calculateGameTime', () => {
    it('should return 0 at frame 0', () => {
      expect(calculateGameTime(0)).toBe(0);
    });

    it('should return 1 at frame 60', () => {
      expect(calculateGameTime(60)).toBe(1);
    });

    it('should return 2 at frame 120', () => {
      expect(calculateGameTime(120)).toBe(2);
    });

    it('should floor the result', () => {
      expect(calculateGameTime(119)).toBe(1);
      expect(calculateGameTime(90)).toBe(1);
    });
  });

  describe('calculateMinutes', () => {
    it('should return 0 for less than 60 seconds', () => {
      expect(calculateMinutes(0)).toBe(0);
      expect(calculateMinutes(30)).toBe(0);
      expect(calculateMinutes(59)).toBe(0);
    });

    it('should return 1 for 60-119 seconds', () => {
      expect(calculateMinutes(60)).toBe(1);
      expect(calculateMinutes(90)).toBe(1);
      expect(calculateMinutes(119)).toBe(1);
    });

    it('should return 5 for 300 seconds', () => {
      expect(calculateMinutes(300)).toBe(5);
    });

    it('should return 10 for 600 seconds', () => {
      expect(calculateMinutes(600)).toBe(10);
    });
  });

  describe('calculateTimeState', () => {
    it('should return initial state at frame 0', () => {
      const result = calculateTimeState(0);
      expect(result.frames).toBe(0);
      expect(result.time).toBe(0);
      expect(result.mins).toBe(0);
    });

    it('should calculate state at frame 60', () => {
      const result = calculateTimeState(60);
      expect(result.frames).toBe(60);
      expect(result.time).toBe(1);
      expect(result.mins).toBe(0);
    });

    it('should calculate state at frame 3600 (1 minute)', () => {
      const result = calculateTimeState(3600);
      expect(result.frames).toBe(3600);
      expect(result.time).toBe(60);
      expect(result.mins).toBe(1);
    });

    it('should calculate state at frame 18000 (5 minutes)', () => {
      const result = calculateTimeState(18000);
      expect(result.frames).toBe(18000);
      expect(result.time).toBe(300);
      expect(result.mins).toBe(5);
    });
  });

  describe('calculateUltCharge', () => {
    it('should increment by 5 every 60 frames', () => {
      expect(calculateUltCharge(0, 0, 100)).toBe(5);
      expect(calculateUltCharge(60, 5, 100)).toBe(10);
    });

    it('should not increment on non-60 frames', () => {
      expect(calculateUltCharge(1, 0, 100)).toBe(0);
      expect(calculateUltCharge(30, 0, 100)).toBe(0);
      expect(calculateUltCharge(59, 0, 100)).toBe(0);
    });

    it('should cap at max charge', () => {
      expect(calculateUltCharge(0, 98, 100)).toBe(100);
      expect(calculateUltCharge(60, 100, 100)).toBe(100);
    });

    it('should not exceed max charge', () => {
      expect(calculateUltCharge(0, 99, 100)).toBe(100);
      expect(calculateUltCharge(0, 100, 100)).toBe(100);
    });

    it('should handle different max values', () => {
      expect(calculateUltCharge(0, 0, 50)).toBe(5);
      expect(calculateUltCharge(0, 45, 50)).toBe(50);
      expect(calculateUltCharge(0, 0, 200)).toBe(5);
    });

    it('should continue incrementing from partial charge', () => {
      expect(calculateUltCharge(60, 10, 100)).toBe(15);
      expect(calculateUltCharge(120, 15, 100)).toBe(20);
    });
  });

  describe('decrementTimeFreeze', () => {
    it('should decrement positive values', () => {
      expect(decrementTimeFreeze(10)).toBe(9);
      expect(decrementTimeFreeze(1)).toBe(0);
    });

    it('should not go below 0', () => {
      expect(decrementTimeFreeze(0)).toBe(0);
      expect(decrementTimeFreeze(-5)).toBe(0);
    });

    it('should handle large values', () => {
      expect(decrementTimeFreeze(1000)).toBe(999);
    });
  });

  describe('decrementUltActiveTime', () => {
    it('should decrement positive values', () => {
      expect(decrementUltActiveTime(10)).toBe(9);
      expect(decrementUltActiveTime(1)).toBe(0);
    });

    it('should not go below 0', () => {
      expect(decrementUltActiveTime(0)).toBe(0);
      expect(decrementUltActiveTime(-5)).toBe(0);
    });
  });

  describe('shouldTriggerAuraAttack', () => {
    it('should return true at frame 0', () => {
      expect(shouldTriggerAuraAttack(0)).toBe(true);
    });

    it('should return true at frame 20', () => {
      expect(shouldTriggerAuraAttack(20)).toBe(true);
    });

    it('should return true at frame 40', () => {
      expect(shouldTriggerAuraAttack(40)).toBe(true);
    });

    it('should return false at other frames', () => {
      expect(shouldTriggerAuraAttack(1)).toBe(false);
      expect(shouldTriggerAuraAttack(10)).toBe(false);
      expect(shouldTriggerAuraAttack(21)).toBe(false);
    });
  });

  describe('shouldUpdateHud', () => {
    it('should return true at frame 0', () => {
      expect(shouldUpdateHud(0)).toBe(true);
    });

    it('should return true at frame 30', () => {
      expect(shouldUpdateHud(30)).toBe(true);
    });

    it('should return true at frame 60', () => {
      expect(shouldUpdateHud(60)).toBe(true);
    });

    it('should return false at other frames', () => {
      expect(shouldUpdateHud(1)).toBe(false);
      expect(shouldUpdateHud(15)).toBe(false);
      expect(shouldUpdateHud(31)).toBe(false);
    });
  });

  describe('shouldTriggerFountainHeal', () => {
    it('should return true at frame 0', () => {
      expect(shouldTriggerFountainHeal(0)).toBe(true);
    });

    it('should return true at frame 30', () => {
      expect(shouldTriggerFountainHeal(30)).toBe(true);
    });

    it('should return true at frame 60', () => {
      expect(shouldTriggerFountainHeal(60)).toBe(true);
    });

    it('should return false at other frames', () => {
      expect(shouldTriggerFountainHeal(1)).toBe(false);
      expect(shouldTriggerFountainHeal(15)).toBe(false);
      expect(shouldTriggerFountainHeal(31)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very large frame counts', () => {
      expect(shouldAdvanceTime(360000)).toBe(true); // 1 hour
      expect(calculateGameTime(360000)).toBe(6000);
      expect(calculateMinutes(6000)).toBe(100); // calculateMinutes takes seconds, not frames
    });

    it('should handle negative frames gracefully', () => {
      expect(shouldAdvanceTime(-1)).toBe(false);
      expect(calculateGameTime(-1)).toBe(-1);
    });

    it('should handle ult charge with zero max', () => {
      expect(calculateUltCharge(0, 0, 0)).toBe(0);
    });
  });
});
