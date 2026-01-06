/**
 * Player movement system.
 *
 * Extracted from game.ts for better testability.
 */

import { CONFIG } from '../config';
import type { Obstacle } from '../entities/obstacle';
import type { InputState } from '../types';

/**
 * Movement direction vector.
 */
export interface Direction {
  dx: number;
  dy: number;
}

/**
 * Movement result with new position.
 */
export interface MovementResult {
  x: number;
  y: number;
}

/**
 * Get input direction from keyboard and joystick.
 *
 * @param input - Current input state
 * @returns Direction vector
 */
export function getInputDirection(input: InputState): Direction {
  // If joystick is active, use it
  if (input.joy.active) {
    return { dx: input.joy.x, dy: input.joy.y };
  }

  // Otherwise use keyboard
  let dx = 0, dy = 0;
  if (input.keys['w']) dy = -1;
  if (input.keys['s']) dy = 1;
  if (input.keys['a']) dx = -1;
  if (input.keys['d']) dx = 1;

  return { dx, dy };
}

/**
 * Check if there is any movement input.
 *
 * @param dir - Direction vector
 * @returns Whether there is movement
 */
export function hasMovementInput(dir: Direction): boolean {
  return dir.dx !== 0 || dir.dy !== 0;
}

/**
 * Normalize movement vector to unit length.
 * Prevents faster diagonal movement.
 *
 * @param dir - Direction vector
 * @returns Normalized direction vector
 */
export function normalizeMovement(dir: Direction): Direction {
  const len = Math.hypot(dir.dx, dir.dy);
  if (len > 1) {
    return { dx: dir.dx / len, dy: dir.dy / len };
  }
  return dir;
}

/**
 * Calculate player movement speed.
 *
 * @param baseSpeed - Player's base speed
 * @param ultName - Name of ult ability
 * @param ultActiveTime - Frames remaining on ult
 * @returns Speed multiplier
 */
export function calculateSpeedMultiplier(baseSpeed: number, ultName: string, ultActiveTime: number): number {
  if (ultName === 'ShadowStep' && ultActiveTime > 0) {
    return baseSpeed * 1.5;
  }
  return baseSpeed;
}

/**
 * Calculate wrapped position within world bounds.
 *
 * @param pos - Position to wrap
 * @returns Wrapped position
 */
export function wrapPosition(pos: number): number {
  return (pos + CONFIG.worldSize) % CONFIG.worldSize;
}

/**
 * Normalize relative position for rendering (handles toroidal world).
 * Converts entity-to-camera offset to the range [-worldSize/2, worldSize/2].
 * Only wraps if the offset is within reasonable bounds (prevents far-away
 * entities from being wrapped to visible positions).
 *
 * @param relativePos - Entity position minus camera position
 * @returns Normalized offset for rendering
 */
export function wrapRelativePosition(relativePos: number): number {
  // Only wrap if within one world size (entity and camera both in world bounds)
  if (Math.abs(relativePos) <= CONFIG.worldSize) {
    if (relativePos < -CONFIG.worldSize / 2) return relativePos + CONFIG.worldSize;
    if (relativePos > CONFIG.worldSize / 2) return relativePos - CONFIG.worldSize;
  }
  return relativePos;
}

/**
 * Calculate new position with wrapping.
 *
 * @param currentX - Current X position
 * @param currentY - Current Y position
 * @param dx - Normalized X direction
 * @param dy - Normalized Y direction
 * @param speed - Movement speed
 * @returns New wrapped position
 */
export function calculateNewPosition(
  currentX: number,
  currentY: number,
  dx: number,
  dy: number,
  speed: number
): MovementResult {
  return {
    x: wrapPosition(currentX + dx * speed),
    y: wrapPosition(currentY + dy * speed),
  };
}

/**
 * Check if a position collides with any obstacle.
 * Note: Skips fountain ('font') type obstacles.
 *
 * @param x - Position X to check
 * @param y - Position Y to check
 * @param obstacles - Array of obstacles
 * @returns Whether position is blocked
 */
export function checkObstacleCollision(x: number, y: number, obstacles: Obstacle[]): boolean {
  for (const o of obstacles) {
    // Skip fountains (walkable)
    if (o.type === 'font') continue;

    // Get wrapped relative distance (Shortest distance in toroidal world)
    let dx = x - o.x;
    let dy = y - o.y;

    if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
    if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
    if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
    if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;

    // AABB collision check with slight buffer (8 units)
    const margin = 8;
    const halfW = o.w / 2 + margin;
    const halfH = o.h / 2 + margin;

    if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate final movement position with wall sliding.
 * Tries full diagonal movement first, then slides along walls if blocked.
 *
 * @param currentX - Current X position
 * @param currentY - Current Y position
 * @param dx - Normalized X direction
 * @param dy - Normalized Y direction
 * @param speed - Movement speed
 * @param obstacles - Array of obstacles
 * @returns Final position after collision handling
 */
export function calculateMovementWithCollision(
  currentX: number,
  currentY: number,
  dx: number,
  dy: number,
  speed: number,
  obstacles: Obstacle[]
): MovementResult {
  // Try full diagonal movement first
  const newPos = calculateNewPosition(currentX, currentY, dx, dy, speed);

  if (!checkObstacleCollision(newPos.x, newPos.y, obstacles)) {
    return newPos;
  }

  // Wall sliding: try each axis separately
  let finalX = currentX;
  let finalY = currentY;

  const tryX = wrapPosition(currentX + dx * speed);
  if (!checkObstacleCollision(tryX, currentY, obstacles)) {
    finalX = tryX;
  }

  const tryY = wrapPosition(currentY + dy * speed);
  if (!checkObstacleCollision(currentX, tryY, obstacles)) {
    finalY = tryY;
  }

  return { x: finalX, y: finalY };
}

/**
 * Process player movement for one frame.
 * Combines all movement logic into a single function.
 *
 * @param currentX - Current X position
 * @param currentY - Current Y position
 * @param input - Current input state
 * @param baseSpeed - Player's base speed
 * @param ultName - Name of ult ability
 * @param ultActiveTime - Frames remaining on ult
 * @param obstacles - Array of obstacles
 * @returns New position and last direction (for aiming fallback)
 */
export function processPlayerMovement(
  currentX: number,
  currentY: number,
  input: InputState,
  baseSpeed: number,
  ultName: string,
  ultActiveTime: number,
  obstacles: Obstacle[]
): { x: number; y: number; lastDx: number; lastDy: number } {
  const dir = getInputDirection(input);

  if (!hasMovementInput(dir)) {
    return {
      x: currentX,
      y: currentY,
      lastDx: input.lastDx || 0,
      lastDy: input.lastDy || 0,
    };
  }

  const normalized = normalizeMovement(dir);
  const speed = calculateSpeedMultiplier(baseSpeed, ultName, ultActiveTime);

  const newPos = calculateMovementWithCollision(
    currentX,
    currentY,
    normalized.dx,
    normalized.dy,
    speed,
    obstacles
  );

  return {
    x: newPos.x,
    y: newPos.y,
    lastDx: dir.dx,
    lastDy: dir.dy,
  };
}
