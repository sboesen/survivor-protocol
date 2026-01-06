import type { EntityType } from '../types';
import type { ItemType } from './types';

const BASE_DROP_CHANCE: Record<EntityType, number> = {
  basic: 0.05,
  bat: 0.03,
  elite: 1,
  boss: 1,
};

const ITEM_TYPE_WEIGHTS: Record<ItemType, number> = {
  weapon: 1,
  helm: 1,
  armor: 1,
  accessory: 1,
};

export function calculateDropChance(
  enemyType: EntityType,
  luck: number,
  minutesElapsed: number
): number {
  const base = BASE_DROP_CHANCE[enemyType] ?? 0;
  const luckMultiplier = 1 + luck / 200;
  const timeMultiplier = 1 + Math.min(minutesElapsed, 20) / 10;
  const chance = base * luckMultiplier * timeMultiplier;
  return Math.min(chance, 1);
}

export function shouldDropItem(
  enemyType: EntityType,
  luck: number,
  minutesElapsed: number,
  random: () => number = Math.random
): boolean {
  const chance = calculateDropChance(enemyType, luck, minutesElapsed);
  return random() < chance;
}

export function rollItemType(random: () => number = Math.random): ItemType {
  const entries = Object.entries(ITEM_TYPE_WEIGHTS) as Array<[ItemType, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const roll = random() * total;
  let acc = 0;
  for (const [type, weight] of entries) {
    acc += weight;
    if (roll <= acc) return type;
  }
  return entries[entries.length - 1][0];
}
