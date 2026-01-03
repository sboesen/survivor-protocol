/**
 * Ultimate ability system.
 *
 * Extracted from game.ts for better testability.
 */

/**
 * Check if a player has damage immunity from their ultimate.
 *
 * Security and Reboot ultimates provide damage immunity while active.
 *
 * @param ultName - The player's ultimate name
 * @param ultActiveTime - The remaining frames the ultimate is active
 * @returns Whether the player has damage immunity
 */
export function hasDamageImmunity(ultName: string, ultActiveTime: number): boolean {
  return (ultName === 'Security' || ultName === 'Reboot') && ultActiveTime > 0;
}

/**
 * Calculate new HP after Reboot ultimate heals.
 *
 * Reboot heals for 50% of max HP, capped at max HP.
 *
 * @param currentHp - The player's current HP
 * @param maxHp - The player's max HP
 * @returns New HP value after healing
 */
export function calculateRebootHeal(currentHp: number, maxHp: number): number {
  return Math.min(maxHp, currentHp + maxHp * 0.5);
}

/**
 * Data about an ultimate ability.
 */
export interface UltConfig {
  /** Duration in frames (60 = ~1 second at 60fps) */
  duration: number;
  /** Display text shown when ult is triggered */
  text: string;
  /** Color of the display text */
  color: string;
}

/**
 * Get configuration data for an ultimate.
 *
 * @param ultName - The ultimate name
 * @returns Config object, or null if unknown ult
 */
export function getUltConfig(ultName: string): UltConfig | null {
  const configs: Record<string, UltConfig> = {
    Security: { duration: 300, text: 'SECURITY!', color: '#4af' },
    Ollie: { duration: 300, text: 'OLLIE!', color: '#0f0' },
    ClosingTime: { duration: 240, text: 'CLOSED!', color: '#888' },
    GreaseFire: { duration: 0, text: 'GREASE FIRE!', color: '#f80' },
    Reboot: { duration: 300, text: 'REBOOT!', color: '#0ff' },
  };

  return configs[ultName] ?? null;
}

/**
 * Projectile data for GreaseFire ultimate.
 */
export interface GreaseFireProjectile {
  angle: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  duration: number;
  pierce: number;
  isArc: true;
}

/**
 * Calculate projectile data for GreaseFire ultimate.
 *
 * Creates 12 projectiles in a circle around the player.
 *
 * @param x - Player X position
 * @param y - Player Y position
 * @returns Array of 12 projectile data objects
 */
export function calculateGreaseFireProjectiles(
  _x: number,
  _y: number
): GreaseFireProjectile[] {
  const projectiles: GreaseFireProjectile[] = [];

  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i;
    projectiles.push({
      angle,
      vx: Math.cos(angle) * 5,
      vy: Math.sin(angle) * 5,
      damage: 20,
      color: '#f80',
      duration: 100,
      pierce: 999,
      isArc: true,
    });
  }

  return projectiles;
}

/**
 * Get the time freeze duration for ClosingTime ultimate.
 *
 * @returns Time freeze duration in frames
 */
export function getTimeFreezeDuration(): number {
  return 240; // 4 seconds at 60fps
}
