import { describe, it, expect } from 'vitest';
import {
  calculateZoomScale,
  calculateJoystickParams,
  calculateGridParams,
  FLOOR_COLOR,
  JOYSTICK_COLORS,
} from '../rendering';

describe('rendering', () => {
  describe('calculateZoomScale', () => {
    it('should return 1 for non-touch devices', () => {
      expect(calculateZoomScale(false, 0)).toBe(1);
    });

    it('should return 0.7 for touch devices', () => {
      expect(calculateZoomScale(true, 0)).toBe(0.7);
    });

    it('should return 0.7 when maxTouchPoints > 0', () => {
      expect(calculateZoomScale(false, 1)).toBe(0.7);
      expect(calculateZoomScale(false, 5)).toBe(0.7);
    });

    it('should prioritize hasTouch over maxTouchPoints', () => {
      expect(calculateZoomScale(true, 0)).toBe(0.7);
    });
  });

  describe('calculateJoystickParams', () => {
    it('should calculate centered joystick with neutral input', () => {
      const result = calculateJoystickParams(100, 200, 0, 0);
      expect(result.centerX).toBe(100);
      expect(result.centerY).toBe(210); // +10 default offsetY
      expect(result.knobX).toBe(100);
      expect(result.knobY).toBe(210);
      expect(result.baseRadius).toBe(50);
      expect(result.knobRadius).toBe(20);
    });

    it('should calculate knob position with positive input', () => {
      const result = calculateJoystickParams(100, 200, 0.5, 0.5);
      expect(result.centerX).toBe(100);
      expect(result.knobX).toBe(125); // 100 + 0.5 * 50
      expect(result.knobY).toBe(235); // 210 + 0.5 * 50
    });

    it('should calculate knob position with negative input', () => {
      const result = calculateJoystickParams(100, 200, -0.5, -0.5);
      expect(result.knobX).toBe(75); // 100 + (-0.5) * 50
      expect(result.knobY).toBe(185); // 210 + (-0.5) * 50
    });

    it('should use custom offset', () => {
      const result = calculateJoystickParams(100, 200, 0, 0, 20);
      expect(result.centerY).toBe(220); // 200 + 20
    });

    it('should use custom radii', () => {
      const result = calculateJoystickParams(100, 200, 0, 0, 10, 40, 15);
      expect(result.baseRadius).toBe(40);
      expect(result.knobRadius).toBe(15);
    });

    it('should clamp knob position at base radius with full input', () => {
      const result = calculateJoystickParams(100, 200, 1, 1);
      expect(result.knobX).toBe(150); // 100 + 1 * 50
      expect(result.knobY).toBe(260); // 210 + 1 * 50
    });
  });

  describe('calculateGridParams', () => {
    it('should calculate grid offset from player position', () => {
      const result = calculateGridParams(450, 320);
      expect(result.tileSize).toBe(100);
      expect(result.offsetX).toBe(50); // 450 % 100
      expect(result.offsetY).toBe(20); // 320 % 100
      expect(result.color).toBe('#252b3d');
      expect(result.lineWidth).toBe(1);
    });

    it('should handle player at origin', () => {
      const result = calculateGridParams(0, 0);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });

    it('should handle player at exact tile boundary', () => {
      const result = calculateGridParams(100, 200);
      expect(result.offsetX).toBe(0); // 100 % 100 = 0
      expect(result.offsetY).toBe(0); // 200 % 100 = 0
    });

    it('should handle large player positions', () => {
      const result = calculateGridParams(1950, 1800);
      expect(result.offsetX).toBe(50); // 1950 % 100
      expect(result.offsetY).toBe(0); // 1800 % 100
    });

    it('should use custom tile size', () => {
      const result = calculateGridParams(150, 250, 50);
      expect(result.tileSize).toBe(50);
      expect(result.offsetX).toBe(0); // 150 % 50 = 0
      expect(result.offsetY).toBe(0); // 250 % 50 = 0
    });
  });

  describe('constants', () => {
    it('should have floor color constant', () => {
      expect(FLOOR_COLOR).toBe('#1a1f2e');
    });

    it('should have joystick color constants', () => {
      expect(JOYSTICK_COLORS.movement.base).toBe('rgba(255, 255, 255, 0.3)');
      expect(JOYSTICK_COLORS.movement.knob).toBe('rgba(255, 255, 255, 0.5)');
      expect(JOYSTICK_COLORS.aim.base).toBe('rgba(255, 200, 100, 0.3)');
      expect(JOYSTICK_COLORS.aim.knob).toBe('rgba(255, 200, 100, 0.5)');
    });
  });
});
