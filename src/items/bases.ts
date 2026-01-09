import type { EntityType } from '../types';
import type { ItemAffix, ItemType } from './types';

export interface ItemBase {
  id: string;
  name: string;
  type: ItemType;
  tier: number;
  implicits: ItemAffix[];
  tint?: string;
}

export const MAX_BASE_TIER = 5;

const weaponTint = '#7c3aed';
const helmTint = '#60a5fa';
const armorTint = '#f97316';
const accessoryTint = '#eab308';
const relicTint = '#fbbf24';

export const ITEM_BASES: ItemBase[] = [
  {
    id: 'rusty_dagger',
    name: 'Rusty Dagger',
    type: 'weapon',
    tier: 1,
    implicits: [{ type: 'percentDamage', tier: 1, value: 8, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'battered_sword',
    name: 'Battered Sword',
    type: 'weapon',
    tier: 1,
    implicits: [{ type: 'percentDamage', tier: 1, value: 8, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'spiked_club',
    name: 'Spiked Club',
    type: 'weapon',
    tier: 2,
    implicits: [{ type: 'percentDamage', tier: 1, value: 12, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'splintered_spear',
    name: 'Splintered Spear',
    type: 'weapon',
    tier: 2,
    implicits: [{ type: 'percentDamage', tier: 1, value: 12, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'heavy_hammer',
    name: 'Heavy Hammer',
    type: 'weapon',
    tier: 3,
    implicits: [{ type: 'percentDamage', tier: 1, value: 18, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'brutal_great_axe',
    name: 'Brutal Great Axe',
    type: 'weapon',
    tier: 3,
    implicits: [{ type: 'percentDamage', tier: 1, value: 18, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'hunting_bow',
    name: 'Hunting Bow',
    type: 'weapon',
    tier: 4,
    implicits: [{ type: 'percentDamage', tier: 1, value: 24, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'barbed_arrow',
    name: 'Barbed Arrow',
    type: 'weapon',
    tier: 4,
    implicits: [{ type: 'percentDamage', tier: 1, value: 24, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'mystic_wand',
    name: 'Mystic Wand',
    type: 'weapon',
    tier: 5,
    implicits: [{ type: 'percentDamage', tier: 1, value: 32, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'blazing_torch',
    name: 'Blazing Torch',
    type: 'weapon',
    tier: 5,
    implicits: [{ type: 'percentDamage', tier: 1, value: 32, isPercent: true }],
    tint: weaponTint,
  },
  {
    id: 'leather_hood',
    name: 'Leather Hood',
    type: 'helm',
    tier: 1,
    implicits: [{ type: 'maxHp', tier: 1, value: 10 }],
    tint: helmTint,
  },
  {
    id: 'stitched_hood',
    name: 'Stitched Hood',
    type: 'helm',
    tier: 2,
    implicits: [{ type: 'maxHp', tier: 1, value: 18 }],
    tint: helmTint,
  },
  {
    id: 'iron_helm',
    name: 'Iron Helm',
    type: 'helm',
    tier: 3,
    implicits: [{ type: 'maxHp', tier: 1, value: 28 }],
    tint: helmTint,
  },
  {
    id: 'warlord_helm',
    name: 'Warlord Helm',
    type: 'helm',
    tier: 4,
    implicits: [{ type: 'maxHp', tier: 1, value: 40 }],
    tint: helmTint,
  },
  {
    id: 'wardens_helm',
    name: 'Warden Helm',
    type: 'helm',
    tier: 5,
    implicits: [{ type: 'maxHp', tier: 1, value: 55 }],
    tint: helmTint,
  },
  {
    id: 'leather_vest',
    name: 'Leather Vest',
    type: 'armor',
    tier: 1,
    implicits: [{ type: 'armor', tier: 1, value: 1 }],
    tint: armorTint,
  },
  {
    id: 'scale_vest',
    name: 'Scale Vest',
    type: 'armor',
    tier: 2,
    implicits: [{ type: 'armor', tier: 1, value: 2 }],
    tint: armorTint,
  },
  {
    id: 'chain_cuirass',
    name: 'Chain Cuirass',
    type: 'armor',
    tier: 3,
    implicits: [{ type: 'armor', tier: 1, value: 3 }],
    tint: armorTint,
  },
  {
    id: 'plate_hauberk',
    name: 'Plate Hauberk',
    type: 'armor',
    tier: 4,
    implicits: [{ type: 'armor', tier: 1, value: 4 }],
    tint: armorTint,
  },
  {
    id: 'bastion_cuirass',
    name: 'Bastion Cuirass',
    type: 'armor',
    tier: 5,
    implicits: [{ type: 'armor', tier: 1, value: 5 }],
    tint: armorTint,
  },
  {
    id: 'copper_charm',
    name: 'Copper Charm',
    type: 'accessory',
    tier: 1,
    implicits: [{ type: 'luck', tier: 1, value: 5, isPercent: true }],
    tint: accessoryTint,
  },
  {
    id: 'silver_charm',
    name: 'Silver Charm',
    type: 'accessory',
    tier: 2,
    implicits: [{ type: 'luck', tier: 1, value: 9, isPercent: true }],
    tint: accessoryTint,
  },
  {
    id: 'gold_charm',
    name: 'Gold Charm',
    type: 'accessory',
    tier: 3,
    implicits: [{ type: 'luck', tier: 1, value: 13, isPercent: true }],
    tint: accessoryTint,
  },
  {
    id: 'arcane_charm',
    name: 'Arcane Charm',
    type: 'accessory',
    tier: 4,
    implicits: [{ type: 'luck', tier: 1, value: 18, isPercent: true }],
    tint: accessoryTint,
  },
  {
    id: 'eclipse_charm',
    name: 'Eclipse Charm',
    type: 'accessory',
    tier: 5,
    implicits: [{ type: 'luck', tier: 1, value: 24, isPercent: true }],
    tint: accessoryTint,
  },
  {
    id: 'ancient_relic',
    name: 'Ancient Relic',
    type: 'relic',
    tier: 5,
    implicits: [{ type: 'allStats', tier: 1, value: 3, isPercent: true }],
    tint: relicTint,
  },
  // Offhand items - quivers and orbs
  {
    id: 'leather_quiver',
    name: 'Leather Quiver',
    type: 'offhand',
    tier: 1,
    implicits: [{ type: 'projectileSpeed', tier: 1, value: 5, isPercent: true }],
    tint: '#22c55e',
  },
  {
    id: 'hunters_quiver',
    name: "Hunter's Quiver",
    type: 'offhand',
    tier: 2,
    implicits: [{ type: 'projectileSpeed', tier: 1, value: 10, isPercent: true }],
    tint: '#22c55e',
  },
  {
    id: 'rangers_quiver',
    name: "Ranger's Quiver",
    type: 'offhand',
    tier: 3,
    implicits: [{ type: 'projectileSpeed', tier: 1, value: 15, isPercent: true }],
    tint: '#22c55e',
  },
  {
    id: 'piercing_quiver',
    name: 'Piercing Quiver',
    type: 'offhand',
    tier: 4,
    implicits: [{ type: 'pierce', tier: 1, value: 1 }],
    tint: '#22c55e',
  },
  {
    id: 'ethereal_orb',
    name: 'Ethereal Orb',
    type: 'offhand',
    tier: 5,
    implicits: [{ type: 'projectiles', tier: 1, value: 1 }],
    tint: '#22c55e',
  },
];

const BASES_BY_TYPE = ITEM_BASES.reduce<Record<ItemType, ItemBase[]>>((acc, base) => {
  if (!acc[base.type]) acc[base.type] = [];
  acc[base.type].push(base);
  return acc;
}, {} as Record<ItemType, ItemBase[]>);

export function getBaseTierRange(minutesElapsed: number): { min: number; max: number } {
  if (minutesElapsed < 3) return { min: 1, max: 1 };
  if (minutesElapsed < 6) return { min: 1, max: 2 };
  if (minutesElapsed < 10) return { min: 2, max: 3 };
  if (minutesElapsed < 15) return { min: 3, max: 4 };
  return { min: 4, max: 5 };
}

export function rollBaseTier(
  minutesElapsed: number,
  enemyType: EntityType,
  random: () => number = Math.random
): number {
  const { min, max } = getBaseTierRange(minutesElapsed);
  const bonus = enemyType === 'elite' || enemyType === 'boss' ? 1 : 0;
  const minTier = Math.min(min + bonus, MAX_BASE_TIER);
  const maxTier = Math.min(max + bonus, MAX_BASE_TIER);
  if (minTier >= maxTier) return minTier;
  const roll = Math.floor(random() * (maxTier - minTier + 1)) + minTier;
  return roll;
}

export function getBaseByTier(
  itemType: ItemType,
  tier: number,
  random: () => number = Math.random
): ItemBase {
  const pool = BASES_BY_TYPE[itemType] ?? [];
  const candidates = pool.filter(base => base.tier === tier);
  const selection = candidates.length > 0 ? candidates : pool;
  if (selection.length === 0) {
    throw new Error(`No base items defined for type '${itemType}'`);
  }
  return selection[Math.floor(random() * selection.length)];
}
