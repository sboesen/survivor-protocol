export type ItemType = 'weapon' | 'helm' | 'armor' | 'accessory' | 'relic';

export type ItemRarity = 'common' | 'magic' | 'rare' | 'legendary';

export type AffixType =
  | 'flatDamage'
  | 'percentDamage'
  | 'areaFlat'
  | 'areaPercent'
  | 'cooldownReduction'
  | 'projectiles'
  | 'pierce'
  | 'duration'
  | 'speed'
  | 'projectileSpeed'
  | 'maxHp'
  | 'armor'
  | 'hpRegen'
  | 'percentHealing'
  | 'magnet'
  | 'luck'
  | 'percentGold'
  | 'pickupRadius'
  | 'percentXp'
  | 'allStats'
  | 'ricochetDamage';

export interface AffixDefinition {
  type: AffixType;
  weight: number;
  tiers: Array<number | null>;
  isPercent?: boolean;
}

export interface ItemAffix {
  type: AffixType;
  tier: number;
  value: number;
  isPercent?: boolean;
}

export interface Item {
  id: string;
  name: string;
  baseId: string;
  baseName: string;
  tier: number;
  type: ItemType;
  rarity: ItemRarity;
  affixes: ItemAffix[];
  implicits: ItemAffix[];
  baseTint?: string;
}

export type StashSlot = Item | null;

export interface GenerateOptions {
  itemType: ItemType;
  luck: number;
  rarityBoost?: number;
  random?: () => number;
  minutesElapsed?: number;
  enemyType?: 'basic' | 'bat' | 'elite' | 'boss';
  baseTier?: number;
}
