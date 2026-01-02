/**
 * Enemy spawning system.
 *
 * Extracted from game.ts for better testability and maintainability.
 */

import type { EntityType } from '../types';

/**
 * Game state needed for spawning decisions.
 */
export interface SpawnState {
  /** Current frame count */
  frames: number;
  /** Time survived in seconds */
  time: number;
  /** Minutes survived (integer) */
  mins: number;
  /** Time freeze frames remaining (spawn is paused when > 0) */
  timeFreeze: number;
  /** Whether a boss currently exists */
  hasExistingBoss: boolean;
}

/**
 * Result of a spawn check.
 */
export interface SpawnDecision {
  /** Whether an enemy should spawn */
  shouldSpawn: boolean;
  /** The type of enemy to spawn (undefined if not spawning) */
  type: EntityType | undefined;
}

/**
 * Get the spawn interval based on minutes survived.
 * Spawning becomes more frequent over time, capped at 10 frames.
 *
 * @param mins - Minutes survived
 * @returns Frame interval between spawns
 */
export function getSpawnInterval(mins: number): number {
  return Math.max(10, 60 - mins * 5);
}

/**
 * Determine if an elite should spawn at the current time.
 * Elites spawn every 60 seconds.
 *
 * @param time - Time survived in seconds
 * @returns Whether an elite should spawn
 */
export function shouldSpawnElite(time: number): boolean {
  return time > 0 && time % 60 === 0;
}

/**
 * Determine if a boss should spawn at the current time.
 * Bosses spawn every 300 seconds (5 minutes).
 *
 * @param time - Time survived in seconds
 * @returns Whether a boss should spawn
 */
export function shouldSpawnBoss(time: number): boolean {
  return time > 0 && time % 300 === 0;
}

/**
 * Determine enemy type based on spawn conditions.
 *
 * @param time - Time survived in seconds
 * @param randomValue - Random value [0,1) for type selection (allows testing)
 * @returns The enemy type to spawn
 */
export function determineEnemyType(
  time: number,
  randomValue: number = Math.random()
): EntityType {
  if (shouldSpawnBoss(time)) {
    return 'boss';
  }
  if (shouldSpawnElite(time)) {
    return 'elite';
  }
  if (randomValue > 0.9) {
    return 'bat';
  }
  return 'basic';
}

/**
 * Calculate whether an enemy should spawn this frame.
 *
 * @param state - Current game state
 * @returns Spawn decision including type if applicable
 */
export function calculateSpawn(state: SpawnState): SpawnDecision {
  const { frames, time, mins, timeFreeze, hasExistingBoss } = state;

  // Don't spawn if time is frozen
  if (timeFreeze > 0) {
    return { shouldSpawn: false, type: undefined };
  }

  // Check if we're on a spawn frame
  const interval = getSpawnInterval(mins);
  if (frames % interval !== 0) {
    return { shouldSpawn: false, type: undefined };
  }

  // Determine enemy type
  const type = determineEnemyType(time);

  // Only spawn boss if no existing boss
  if (type === 'boss' && hasExistingBoss) {
    return { shouldSpawn: false, type: undefined };
  }

  return { shouldSpawn: true, type };
}

/**
 * Check if a spawn is allowed for a specific enemy type.
 * Used to filter out boss spawns when one already exists.
 *
 * @param type - Enemy type to check
 * @param hasExistingBoss - Whether a boss already exists
 * @returns Whether the spawn is allowed
 */
export function isSpawnAllowed(
  type: EntityType,
  hasExistingBoss: boolean
): boolean {
  if (type === 'boss' && hasExistingBoss) {
    return false;
  }
  return true;
}
