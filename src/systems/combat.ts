/**
 * Collision detection system.
 *
 * Extracted from game.ts for better testability.
 */

import { CONFIG } from '../config';
import { Utils } from '../utils';
import type { Enemy } from '../entities/enemy';
import type { Projectile } from '../entities/projectile';

/**
 * Result of a collision check between a projectile and an enemy.
 */
export interface ProjectileHitResult {
  hit: boolean;
  enemy: Enemy | null;
  shouldSplit?: boolean; // Bubble split
  shouldExplode?: boolean; // Explosion effect
  explodeRadius?: number; // For AOE
  knockback?: { angle: number; force: number };
}

/**
 * Result of an explosion AOE check.
 */
export interface ExplosionResult {
  enemies: Enemy[];
  damageMultiplier: number; // 0.5 for explosion damage
}

/**
 * Result of player-enemy collision.
 */
export interface PlayerCollisionResult {
  collided: boolean;
  damage: number;
  shouldDamage: boolean; // Based on frame timing
}

/**
 * Check if a projectile hits any enemy.
 *
 * @param proj - The projectile to check
 * @param enemies - List of enemies to check against
 * @returns Hit result with enemy and special effects
 */
export function checkProjectileEnemyCollision(
  proj: Projectile,
  enemies: Enemy[]
): ProjectileHitResult {
  if (proj.isHostile) {
    // Hostile projectiles don't hit enemies (they hit player, checked elsewhere)
    return { hit: false, enemy: null };
  }

  for (const e of enemies) {
    // Skip if already hit
    if (proj.hitList.includes(e)) continue;

    // Check distance collision
    if (Utils.getDist(proj.x, proj.y, e.x, e.y) < proj.radius + e.radius) {
      const result: ProjectileHitResult = {
        hit: true,
        enemy: e,
        shouldSplit: (proj as any).splits === true,
        shouldExplode: proj.explodeRadius !== undefined,
        explodeRadius: proj.explodeRadius,
      };

      if (proj.knockback) {
        const angle = Math.atan2(e.y - proj.y, e.x - proj.x);
        result.knockback = { angle, force: proj.knockback };
      }

      return result;
    }
  }

  return { hit: false, enemy: null };
}

/**
 * Find all enemies within an explosion radius.
 *
 * @param centerX - Explosion center X
 * @param centerY - Explosion center Y
 * @param radius - Explosion radius
 * @param enemies - List of enemies to check
 * @param exclude - Enemies to exclude from damage (already hit directly)
 * @returns List of enemies in explosion radius
 */
export function findEnemiesInExplosion(
  centerX: number,
  centerY: number,
  radius: number,
  enemies: Enemy[],
  exclude: Enemy[] = []
): ExplosionResult {
  const hitEnemies: Enemy[] = [];

  for (const e of enemies) {
    if (exclude.includes(e)) continue;

    const dist = Utils.getDist(centerX, centerY, e.x, e.y);
    if (dist < radius) {
      hitEnemies.push(e);
    }
  }

  return {
    enemies: hitEnemies,
    damageMultiplier: 0.5, // Explosion damage is halved
  };
}

/**
 * Apply knockback to an enemy.
 *
 * @param enemy - The enemy to knockback
 * @param angle - Direction of knockback
 * @param force - Distance to knock back
 * @returns New position { x, y }
 */
export function applyKnockback(
  enemy: Enemy,
  angle: number,
  force: number
): { x: number; y: number } {
  const newX = (enemy.x + Math.cos(angle) * force + CONFIG.worldSize) % CONFIG.worldSize;
  const newY = (enemy.y + Math.sin(angle) * force + CONFIG.worldSize) % CONFIG.worldSize;
  return { x: newX, y: newY };
}

/**
 * Check player-enemy collision.
 *
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @param playerRadius - Player collision radius
 * @param enemies - List of enemies
 * @param frameCount - Current frame count (for damage timing)
 * @param hasDamageImmunity - Whether player has damage immunity (Security/Reboot ult)
 * @returns Collision result
 */
export function checkPlayerEnemyCollision(
  playerX: number,
  playerY: number,
  playerRadius: number,
  enemies: Enemy[],
  frameCount: number,
  hasDamageImmunity: boolean
): PlayerCollisionResult {
  if (hasDamageImmunity) {
    return { collided: false, damage: 0, shouldDamage: false };
  }

  for (const e of enemies) {
    const dist = Utils.getDist(playerX, playerY, e.x, e.y);
    if (dist < playerRadius + e.radius) {
      // Damage every 30 frames
      const shouldDamage = frameCount % 30 === 0;
      return {
        collided: true,
        damage: 5,
        shouldDamage,
      };
    }
  }

  return { collided: false, damage: 0, shouldDamage: false };
}

/**
 * Check if hostile projectile hits player.
 *
 * Note: Immunity doesn't prevent collision detection, it just prevents damage.
 * The projectile should still be marked/destroyed on hit.
 *
 * @param proj - The projectile to check
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @param playerRadius - Player collision radius
 * @returns Whether the player was hit (regardless of immunity)
 */
export function checkProjectilePlayerCollision(
  proj: Projectile,
  playerX: number,
  playerY: number,
  playerRadius: number
): boolean {
  if (!proj.isHostile) {
    return false;
  }

  const dist = Utils.getDist(proj.x, proj.y, playerX, playerY);
  return dist < proj.radius + playerRadius;
}

/**
 * Find enemies near a point for trail damage.
 *
 * @param centerX - Center X
 * @param centerY - Center Y
 * @param radius - Search radius
 * @param enemies - List of enemies
 * @param exclude - Enemies to exclude (already hit)
 * @returns Enemies in radius
 */
export function findEnemiesNearPoint(
  centerX: number,
  centerY: number,
  radius: number,
  enemies: Enemy[],
  exclude: Enemy[] = []
): Enemy[] {
  const result: Enemy[] = [];

  for (const e of enemies) {
    if (exclude.includes(e)) continue;

    const dist = Utils.getDist(centerX, centerY, e.x, e.y);
    if (dist < radius) {
      result.push(e);
    }
  }

  return result;
}

/**
 * Calculate split bubble projectiles.
 *
 * @param x - Split origin X
 * @param y - Split origin Y
 * @param dmg - Damage of split projectiles
 * @param isCrit - Whether the split is a crit
 * @returns Array of split projectile data
 */
export function calculateBubbleSplit(
  x: number,
  y: number,
  dmg: number,
  isCrit: boolean
): Array<{ x: number; y: number; vx: number; vy: number; dmg: number; isCrit: boolean }> {
  const splits: Array<{ x: number; y: number; vx: number; vy: number; dmg: number; isCrit: boolean }> = [];

  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i;
    splits.push({
      x,
      y,
      vx: Math.cos(angle) * 3,
      vy: Math.sin(angle) * 3,
      dmg: dmg * 0.5,
      isCrit,
    });
  }

  return splits;
}
