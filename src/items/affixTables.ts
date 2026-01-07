import type { AffixDefinition, AffixType, ItemRarity, ItemType } from './types';

export const RARITY_ORDER: ItemRarity[] = ['common', 'magic', 'rare', 'legendary'];

export const RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 600,
  magic: 300,
  rare: 90,
  legendary: 10,
};

export const RARITY_LUCK_FACTORS: Record<ItemRarity, number> = {
  common: 0,
  magic: 1.2,
  rare: 1.5,
  legendary: 2,
};

export const AFFIX_TIER_WEIGHTS = [0.4, 0.3, 0.2, 0.08, 0.02];

export const AFFIX_COUNT_TABLE: Record<ItemRarity, { options: number[]; weights: number[] }> = {
  common: { options: [1], weights: [1] },
  magic: { options: [1, 2], weights: [0.5, 0.5] },
  rare: { options: [3, 4], weights: [0.6, 0.4] },
  legendary: { options: [5, 6], weights: [0.7, 0.3] },
};

const affixValues = {
  flatDamage: [2, 5, 10, 18, 30],
  percentDamage: [10, 20, 35, 50, 75],
  areaFlat: [10, 25, 50, null, null],
  areaPercent: [15, 30, 50, null, null],
  cooldownReduction: [10, 18, 28, 40, 55],
  projectiles: [1, 1, 2, null, null],
  pierce: [1, 2, 3, null, null],
  duration: [1, 2, 3, 4, null],
  speed: [5, 10, 18, 30, 50],
  maxHp: [10, 25, 50, 100, 200],
  armor: [1, 2, 4, null, null],
  hpRegen: [0.5, 1, 2, 4, null],
  percentHealing: [15, 30, 50, null, null],
  magnet: [10, 20, 35, 55, 80],
  luck: [5, 10, 15, null, null],
  percentGold: [20, 40, 75, 120, null],
  pickupRadius: [5, 10, 20, null, null],
  percentXp: [15, 30, 50, null, null],
  allStats: [5, 10, 15, null, null],
} as const satisfies Record<string, Array<number | null>>;

const buildTierBrackets = (tiers: Array<number | null>): Array<{ min: number; max: number } | null> => {
  return tiers.map((value, idx) => {
    if (value === null) return null;
    let prev = 0;
    for (let i = idx - 1; i >= 0; i--) {
      const candidate = tiers[i];
      if (typeof candidate === 'number') {
        prev = candidate;
        break;
      }
    }
    const min = idx === 0 ? 0 : prev;
    return { min, max: value };
  });
};

export const AFFIX_TIER_BRACKETS = Object.fromEntries(
  Object.entries(affixValues).map(([key, tiers]) => [key, buildTierBrackets(tiers)])
) as Record<AffixType, Array<{ min: number; max: number } | null>>;

export const UNIVERSAL_AFFIXES: AffixDefinition[] = [
  { type: 'allStats', weight: 5, tiers: [...affixValues.allStats], isPercent: true },
];

export const AFFIX_POOLS: Record<ItemType, AffixDefinition[]> = {
  weapon: [
    { type: 'flatDamage', weight: 100, tiers: [...affixValues.flatDamage] },
    { type: 'percentDamage', weight: 80, tiers: [...affixValues.percentDamage], isPercent: true },
    { type: 'areaFlat', weight: 60, tiers: [...affixValues.areaFlat] },
    { type: 'areaPercent', weight: 40, tiers: [...affixValues.areaPercent], isPercent: true },
    { type: 'cooldownReduction', weight: 70, tiers: [...affixValues.cooldownReduction], isPercent: true },
    { type: 'projectiles', weight: 15, tiers: [...affixValues.projectiles] },
    { type: 'pierce', weight: 30, tiers: [...affixValues.pierce] },
    { type: 'duration', weight: 40, tiers: [...affixValues.duration] },
    { type: 'speed', weight: 50, tiers: [...affixValues.speed] },
  ],
  helm: [
    { type: 'maxHp', weight: 100, tiers: [...affixValues.maxHp] },
    { type: 'armor', weight: 60, tiers: [...affixValues.armor] },
    { type: 'hpRegen', weight: 40, tiers: [...affixValues.hpRegen] },
    { type: 'speed', weight: 70, tiers: [...affixValues.speed] },
    { type: 'percentHealing', weight: 30, tiers: [...affixValues.percentHealing], isPercent: true },
  ],
  armor: [
    { type: 'maxHp', weight: 100, tiers: [...affixValues.maxHp] },
    { type: 'armor', weight: 60, tiers: [...affixValues.armor] },
    { type: 'hpRegen', weight: 40, tiers: [...affixValues.hpRegen] },
    { type: 'speed', weight: 70, tiers: [...affixValues.speed] },
    { type: 'percentHealing', weight: 30, tiers: [...affixValues.percentHealing], isPercent: true },
  ],
  accessory: [
    { type: 'magnet', weight: 100, tiers: [...affixValues.magnet] },
    { type: 'luck', weight: 50, tiers: [...affixValues.luck], isPercent: true },
    { type: 'percentGold', weight: 60, tiers: [...affixValues.percentGold], isPercent: true },
    { type: 'speed', weight: 80, tiers: [...affixValues.speed] },
    { type: 'pickupRadius', weight: 40, tiers: [...affixValues.pickupRadius] },
    { type: 'percentXp', weight: 35, tiers: [...affixValues.percentXp], isPercent: true },
    { type: 'cooldownReduction', weight: 45, tiers: [...affixValues.cooldownReduction], isPercent: true },
  ],
  relic: [
    { type: 'flatDamage', weight: 100, tiers: [...affixValues.flatDamage] },
    { type: 'percentDamage', weight: 80, tiers: [...affixValues.percentDamage], isPercent: true },
    { type: 'projectiles', weight: 15, tiers: [...affixValues.projectiles] },
    { type: 'pierce', weight: 30, tiers: [...affixValues.pierce] },
    { type: 'maxHp', weight: 80, tiers: [...affixValues.maxHp] },
    { type: 'luck', weight: 60, tiers: [...affixValues.luck], isPercent: true },
    { type: 'percentGold', weight: 40, tiers: [...affixValues.percentGold], isPercent: true },
    { type: 'cooldownReduction', weight: 40, tiers: [...affixValues.cooldownReduction], isPercent: true },
  ],
};
