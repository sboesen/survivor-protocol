/**
 * Enemy targeting system.
 *
 * Extracted from game.ts weapon firing logic for better testability.
 */

import { CONFIG } from '../config';
import type { Enemy } from '../entities/enemy';

/**
 * Result of finding the nearest enemy.
 */
export interface NearestEnemyResult {
  enemy: Enemy | null;
  distance: number;
}

/**
 * Calculate wrapped distance from player to enemy.
 * Handles world wrapping for accurate distance calculations.
 *
 * @param fromX - Origin X position
 * @param fromY - Origin Y position
 * @param toX - Target X position
 * @param toY - Target Y position
 * @returns Wrapped distance
 */
export function calculateWrappedDistance(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): number {
  let dx = toX - fromX;
  let dy = toY - fromY;

  // Wrap X
  if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
  if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;

  // Wrap Y
  if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
  if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;

  return Math.hypot(dx, dy);
}

/**
 * Find the nearest enemy within a maximum distance.
 *
 * @param enemies - Array of enemies to search
 * @param fromX - Origin X position (usually player)
 * @param fromY - Origin Y position (usually player)
 * @param maxDist - Maximum distance to search
 * @returns Nearest enemy result
 */
export function findNearestEnemy(
  enemies: Enemy[],
  fromX: number,
  fromY: number,
  maxDist: number
): NearestEnemyResult {
  let nearest: Enemy | null = null;
  let minDist = maxDist;

  for (const e of enemies) {
    const dist = calculateWrappedDistance(fromX, fromY, e.x, e.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = e;
    }
  }

  return { enemy: nearest, distance: minDist };
}

/**
 * Calculate the angle to a target, accounting for world wrapping.
 *
 * @param fromX - Origin X position
 * @param fromY - Origin Y position
 * @param toX - Target X position
 * @param toY - Target Y position
 * @returns Angle in radians
 */
export function calculateWrappedAngle(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): number {
  let dx = toX - fromX;
  let dy = toY - fromY;

  // Wrap X
  if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
  if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;

  // Wrap Y
  if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
  if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;

  return Math.atan2(dy, dx);
}

/**
 * Find all enemies within a given radius.
 *
 * @param enemies - Array of enemies to search
 * @param fromX - Origin X position
 * @param fromY - Origin Y position
 * @param radius - Search radius
 * @returns Array of enemies within radius
 */
export function findEnemiesInRadius(
  enemies: Enemy[],
  fromX: number,
  fromY: number,
  radius: number
): Enemy[] {
  const result: Enemy[] = [];

  for (const e of enemies) {
    const dist = calculateWrappedDistance(fromX, fromY, e.x, e.y);
    if (dist <= radius) {
      result.push(e);
    }
  }

  return result;
}
