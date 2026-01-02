/**
 * Collision detection system.
 *
 * Extracted from game.ts for better testability.
 * Provides pure functions for collision detection without side effects.
 */

/**
 * Result of a collision check between two entities.
 */
export interface CollisionResult {
  /** Whether a collision occurred */
  collided: boolean;
  /** Distance between the two entities */
  distance: number;
}

/**
 * Check if two circular entities collide.
 *
 * @param x1 - X position of first entity
 * @param y1 - Y position of first entity
 * @param radius1 - Radius of first entity
 * @param x2 - X position of second entity
 * @param y2 - Y position of second entity
 * @param radius2 - Radius of second entity
 * @returns Collision result with distance
 */
export function checkCollision(
  x1: number,
  y1: number,
  radius1: number,
  x2: number,
  y2: number,
  radius2: number
): CollisionResult {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return {
    collided: distance <= radius1 + radius2,
    distance,
  };
}

/**
 * Check if a point is within a circle.
 *
 * @param pointX - X position of point
 * @param pointY - Y position of point
 * @param circleX - X position of circle center
 * @param circleY - Y position of circle center
 * @param radius - Radius of circle
 * @returns Whether the point is inside the circle
 */
export function pointInCircle(
  pointX: number,
  pointY: number,
  circleX: number,
  circleY: number,
  radius: number
): boolean {
  const dx = pointX - circleX;
  const dy = pointY - circleY;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Calculate knockback position.
 *
 * @param x - Current X position
 * @param y - Current Y position
 * @param fromX - X position to knockback from
 * @param fromY - Y position to knockback from
 * @param force - Knockback force
 * @param worldSize - World size for wrapping
 * @returns New position after knockback
 */
export interface Position {
  x: number;
  y: number;
}

export function calculateKnockback(
  x: number,
  y: number,
  fromX: number,
  fromY: number,
  force: number,
  worldSize: number
): Position {
  const angle = Math.atan2(y - fromY, x - fromX);
  return {
    x: (x + Math.cos(angle) * force + worldSize) % worldSize,
    y: (y + Math.sin(angle) * force + worldSize) % worldSize,
  };
}

/**
 * Check if an enemy is in the hit list.
 * Used for projectile pierce logic.
 *
 * @param hitList - List of entities already hit
 * @param enemy - Enemy to check
 * @returns Whether the enemy is in the hit list
 */
export function isEnemyInHitList(hitList: unknown[], enemy: unknown): boolean {
  return hitList.includes(enemy);
}

/**
 * Find all entities within a radius of a point.
 *
 * @param centerX - Center X position
 * @param centerY - Center Y position
 * @param radius - Search radius
 * @param entities - Entities to check
 * @returns Array of entities within the radius
 */
export interface EntityWithPosition {
  x: number;
  y: number;
}

export function findEntitiesInRadius<T extends EntityWithPosition>(
  centerX: number,
  centerY: number,
  radius: number,
  entities: T[]
): T[] {
  const result: T[] = [];
  const radiusSquared = radius * radius;

  for (const entity of entities) {
    const dx = entity.x - centerX;
    const dy = entity.y - centerY;
    if (dx * dx + dy * dy <= radiusSquared) {
      result.push(entity);
    }
  }

  return result;
}

/**
 * Calculate direction angle from one point to another.
 *
 * @param fromX - Starting X position
 * @param fromY - Starting Y position
 * @param toX - Target X position
 * @param toY - Target Y position
 * @returns Angle in radians
 */
export function calculateAngle(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): number {
  return Math.atan2(toY - fromY, toX - fromX);
}

/**
 * Check if pierce should expire.
 *
 * @param currentPierce - Current pierce value
 * @returns Whether the pierce has expired
 */
export function shouldPierceExpire(currentPierce: number): boolean {
  return currentPierce <= 0;
}
