/**
 * Level-up and upgrade system.
 *
 * Extracted from game.ts for better testability.
 */

/**
 * Select random upgrade choices from a pool.
 *
 * @param pool - Array of upgrade IDs to choose from
 * @param count - Number of choices to select (default: 3)
 * @param randomValue - Optional random value function for testing
 * @returns Array of unique upgrade IDs
 */
export function selectUpgradeChoices(
  pool: string[],
  count: number = 3,
  randomValue: () => number = Math.random
): string[] {
  const choices: string[] = [];

  while (choices.length < count && choices.length < pool.length) {
    const randomIndex = Math.floor(randomValue() * pool.length);
    const choice = pool[randomIndex];
    if (!choices.includes(choice)) {
      choices.push(choice);
    }
  }

  return choices;
}

/**
 * Calculate how many upgrade choices to show based on inventory size.
 *
 * @param inventorySize - Current number of weapons/items
 * @param maxChoices - Maximum choices to show (default: 3)
 * @returns Number of choices to show
 */
export function calculateChoiceCount(inventorySize: number, maxChoices: number = 3): number {
  // Show fewer choices when inventory is nearly full to avoid wasted picks
  const remainingSpace = 6 - inventorySize;
  return Math.min(maxChoices, Math.max(1, remainingSpace));
}
