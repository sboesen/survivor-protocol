/**
 * Game over reward calculations.
 *
 * Extracted from game.ts for better testability and maintainability.
 */

export interface GameStats {
  goldRun: number;
  mins: number;
  kills: number;
  bossKills: number;
}

export interface GameOverRewards {
  survivalBonus: number;
  killBonus: number;
  bossBonus: number;
  total: number;
}

/**
 * Calculate game over rewards based on run performance.
 *
 * @param stats - The game statistics at the end of the run
 * @returns The calculated rewards
 */
export function calculateGameOverRewards(stats: GameStats): GameOverRewards {
  const { goldRun, mins, kills, bossKills } = stats;

  // Survival bonus: 20% of goldRun per minute survived
  const survivalBonus = Math.floor(goldRun * (mins * 0.2));

  // Kill bonus: 50 gold per 100 kills (rounded down)
  const killBonus = Math.floor(kills / 100) * 50;

  // Boss bonus: 200 gold per boss killed
  const bossBonus = bossKills * 200;

  // Total rewards
  const total = goldRun + survivalBonus + killBonus + bossBonus;

  return {
    survivalBonus,
    killBonus,
    bossBonus,
    total,
  };
}

/**
 * Calculate the survival bonus component.
 * Survival bonus is 20% of goldRun per minute survived.
 *
 * @param goldRun - Gold collected during the run
 * @param mins - Minutes survived
 * @returns The survival bonus
 */
export function calculateSurvivalBonus(goldRun: number, mins: number): number {
  return Math.floor(goldRun * (mins * 0.2));
}

/**
 * Calculate the kill bonus component.
 * Kill bonus is 50 gold per 100 kills.
 *
 * @param kills - Total kills achieved
 * @returns The kill bonus
 */
export function calculateKillBonus(kills: number): number {
  return Math.floor(kills / 100) * 50;
}

/**
 * Calculate the boss bonus component.
 * Boss bonus is 200 gold per boss killed.
 *
 * @param bossKills - Total bosses killed
 * @returns The boss bonus
 */
export function calculateBossBonus(bossKills: number): number {
  return bossKills * 200;
}

/**
 * Calculate total gold earned from a run including all bonuses.
 *
 * @param stats - The game statistics at the end of the run
 * @returns The total gold earned
 */
export function calculateTotalGold(stats: GameStats): number {
  const rewards = calculateGameOverRewards(stats);
  return rewards.total;
}
