/**
 * Loot collection and magnetism system.
 *
 * Extracted from game.ts for better testability.
 */

import { CONFIG } from '../config';
import type { Player } from '../entities/player';

/**
 * Result of loot position calculation.
 */
export interface LootPositionResult {
  x: number;
  y: number;
}

/**
 * Calculate wrapped distance vector from loot to player.
 * Handles world wrapping for distance calculations.
 *
 * @param lootX - Loot X position
 * @param lootY - Loot Y position
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @returns Wrapped distance vector
 */
export function getWrappedDistanceVector(
  lootX: number,
  lootY: number,
  playerX: number,
  playerY: number
): { dx: number; dy: number } {
  let ldx = playerX - lootX;
  let ldy = playerY - lootY;

  if (ldx > CONFIG.worldSize / 2) ldx -= CONFIG.worldSize;
  if (ldx < -CONFIG.worldSize / 2) ldx += CONFIG.worldSize;
  if (ldy > CONFIG.worldSize / 2) ldy -= CONFIG.worldSize;
  if (ldy < -CONFIG.worldSize / 2) ldy += CONFIG.worldSize;

  return { dx: ldx, dy: ldy };
}

/**
 * Calculate new loot position when being magnetically pulled toward player.
 *
 * @param lootX - Current loot X position
 * @param lootY - Current loot Y position
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @param magnetStrength - How strongly loot is pulled (0-1)
 * @returns New wrapped position
 */
export function calculateLootMagnetPosition(
  lootX: number,
  lootY: number,
  playerX: number,
  playerY: number,
  magnetStrength: number
): LootPositionResult {
  const { dx, dy } = getWrappedDistanceVector(lootX, lootY, playerX, playerY);

  return {
    x: (lootX + dx * magnetStrength + CONFIG.worldSize) % CONFIG.worldSize,
    y: (lootY + dy * magnetStrength + CONFIG.worldSize) % CONFIG.worldSize,
  };
}

/**
 * Check if loot is within pickup range of player.
 *
 * @param lootX - Loot X position
 * @param lootY - Loot Y position
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @param pickupRange - Player's pickup range
 * @returns Whether loot is in range
 */
export function isLootInRange(
  lootX: number,
  lootY: number,
  playerX: number,
  playerY: number,
  pickupRange: number
): boolean {
  const { dx, dy } = getWrappedDistanceVector(lootX, lootY, playerX, playerY);
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist <= pickupRange;
}

/**
 * Check if loot can be collected (direct contact).
 *
 * @param lootX - Loot X position
 * @param lootY - Loot Y position
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @param collectRadius - Distance required for collection
 * @returns Whether loot can be collected
 */
export function canCollectLoot(
  lootX: number,
  lootY: number,
  playerX: number,
  playerY: number,
  collectRadius: number
): boolean {
  const { dx, dy } = getWrappedDistanceVector(lootX, lootY, playerX, playerY);
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist <= collectRadius;
}

/**
 * Result of applying a loot effect.
 */
export interface LootEffectResult {
  /** Type of effect applied */
  type: 'xp' | 'chest' | 'heart' | 'none';
  /** XP gained (if applicable) */
  xp?: number;
  /** HP healed (if applicable) */
  hp?: number;
  /** Message to display */
  message?: string;
  /** Color for message */
  color?: string;
}

/**
 * Calculate the effect of collecting loot on a player.
 * Pure function - returns what would happen, doesn't modify player.
 *
 * @param lootType - Type of loot
 * @param lootValue - Value (for XP gems)
 * @param currentPlayerHp - Player's current HP
 * @param maxPlayerHp - Player's max HP
 * @returns Effect result
 */
export function calculateLootEffect(
  lootType: string,
  lootValue: number,
  currentPlayerHp: number,
  maxPlayerHp: number
): LootEffectResult {
  switch (lootType) {
    case 'gem':
      return {
        type: 'xp',
        xp: lootValue,
        message: '+XP',
        color: '#0f0',
      };
    case 'chest':
      return {
        type: 'chest',
        message: 'CHEST',
        color: '#ff0',
      };
    case 'heart':
      const healAmount = Math.min(30, maxPlayerHp - currentPlayerHp);
      return {
        type: 'heart',
        hp: healAmount,
        message: '+HP',
        color: '#0f0',
      };
    default:
      return { type: 'none' };
  }
}

/**
 * Apply loot effect to player.
 * This modifies the player state and should be called after calculateLootEffect.
 *
 * @param player - The player
 * @param effect - The calculated effect
 * @returns XP gained (0 if not an XP gem)
 */
export function applyLootEffectToPlayer(player: Player, effect: LootEffectResult): number {
  switch (effect.type) {
    case 'xp':
      return effect.xp || 0;
    case 'heart':
      player.hp = Math.min(player.maxHp, player.hp + (effect.hp || 0));
      return 0;
    default:
      return 0;
  }
}
