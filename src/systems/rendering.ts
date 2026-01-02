/**
 * Rendering system - canvas drawing calculations.
 *
 * Extracted from game.ts for better testability.
 */

/**
 * Calculate the zoom scale for rendering.
 *
 * Mobile devices use 0.7x zoom for better visibility.
 *
 * @param hasTouch - Whether the device has touch capability
 * @param maxTouchPoints - Number of touch points (from navigator.maxTouchPoints)
 * @returns Zoom scale factor
 */
export function calculateZoomScale(hasTouch: boolean, maxTouchPoints: number): number {
  const isMobile = hasTouch || maxTouchPoints > 0;
  return isMobile ? 0.7 : 1;
}

/**
 * Joystick rendering parameters.
 */
export interface JoystickParams {
  centerX: number;
  centerY: number;
  knobX: number;
  knobY: number;
  baseRadius: number;
  knobRadius: number;
}

/**
 * Calculate joystick rendering parameters.
 *
 * @param originX - Joystick center X position
 * @param originY - Joystick center Y position
 * @param knobX - Joystick knob X position (-1 to 1)
 * @param knobY - Joystick knob Y position (-1 to 1)
 * @param offsetY - Vertical offset for joystick
 * @param baseRadius - Joystick base radius
 * @param knobRadius - Joystick knob radius
 * @returns Rendering parameters
 */
export function calculateJoystickParams(
  originX: number,
  originY: number,
  knobX: number,
  knobY: number,
  offsetY: number = 10,
  baseRadius: number = 50,
  knobRadius: number = 20
): JoystickParams {
  return {
    centerX: originX,
    centerY: originY + offsetY,
    knobX: originX + knobX * baseRadius,
    knobY: originY + offsetY + knobY * baseRadius,
    baseRadius,
    knobRadius,
  };
}

/**
 * Grid rendering parameters.
 */
export interface GridParams {
  tileSize: number;
  offsetX: number;
  offsetY: number;
  color: string;
  lineWidth: number;
}

/**
 * Calculate grid rendering parameters.
 *
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @param tileSize - Size of each grid tile
 * @returns Grid rendering parameters
 */
export function calculateGridParams(
  playerX: number,
  playerY: number,
  tileSize: number = 100
): GridParams {
  return {
    tileSize,
    offsetX: playerX % tileSize,
    offsetY: playerY % tileSize,
    color: '#252b3d',
    lineWidth: 1,
  };
}

/**
 * Floor background color.
 */
export const FLOOR_COLOR = '#1a1f2e';

/**
 * Joystick colors.
 */
export const JOYSTICK_COLORS = {
  movement: {
    base: 'rgba(255, 255, 255, 0.3)',
    knob: 'rgba(255, 255, 255, 0.5)',
  },
  aim: {
    base: 'rgba(255, 200, 100, 0.3)',
    knob: 'rgba(255, 200, 100, 0.5)',
  },
} as const;
