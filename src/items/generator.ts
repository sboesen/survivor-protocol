import {
  AFFIX_COUNT_TABLE,
  AFFIX_POOLS,
  AFFIX_TIER_BRACKETS,
  AFFIX_TIER_WEIGHTS,
  RARITY_LUCK_FACTORS,
  RARITY_ORDER,
  RARITY_WEIGHTS,
  UNIVERSAL_AFFIXES,
} from './affixTables';
import { getBaseByTier, rollBaseTier, MAX_BASE_TIER } from './bases';
import type { AffixDefinition, AffixType, GenerateOptions, Item, ItemAffix, ItemRarity, ItemType } from './types';
import { getRelicDefinitionById, getRelicsForClass, rollWeightedRelic } from '../data/relics';

const PREFIXES: Record<ItemRarity, string[]> = {
  common: ['Plain', 'Worn', 'Simple', 'Dusty', 'Tarnished', 'Faded'],
  magic: ['Mystic', 'Gleaming', 'Enchanted', 'Starforged', 'Runed', 'Whispering'],
  rare: ['Vicious', 'Royal', 'Grim', 'Bloodstained', 'Voidtouched', 'Graveborn'],
  legendary: ['Mythic', 'Ancient', 'Legendary', 'Doomsworn', 'Eclipse', 'Godsplit'],
  corrupted: ['Damned', 'Cursed', 'Blighted', 'Sinister', 'Wicked', 'Forbidden'],
};

const SUFFIXES: Record<ItemRarity, string[]> = {
  common: ['of Sparks', 'of Dust', 'of Echoes', 'of Cinders', 'of Bones', 'of Smoke'],
  magic: ['of Embers', 'of Frost', 'of Insight', 'of Storms', 'of Whispers', 'of Ashes'],
  rare: ['of Ruin', 'of Valor', 'of Shadows', 'of the Maw', 'of the Pit', 'of the Eclipse'],
  legendary: ['of the Phoenix', 'of Eternity', 'of the Void', 'of the Titan', 'of the Abyss', 'of the Blood Moon'],
  corrupted: ['of the Damned', 'of the Abyss', 'of the Void', 'of the Dark Moon', 'of the Pit', 'of the Grave'],
};

const PREFIX_AFFIX_NAMES: Record<AffixType, string[]> = {
  flatDamage: ['Fierce', 'Brutal', 'Savage'],
  percentDamage: ['Deadly', 'Vicious', 'Razor'],
  areaFlat: ['Broad', 'Wide', 'Expansive'],
  areaPercent: ['Stormwide', 'Volcanic', 'Seismic'],
  cooldownReduction: ['Quickened', 'Hasted', 'Swift'],
  projectiles: ['Split', 'Forked', 'Volley'],
  pierce: ['Piercing', 'Skewering', 'Impaling'],
  duration: ['Lingering', 'Enduring', 'Lasting'],
  speed: ['Rapid', 'Fleet', 'Rush'],
  projectileSpeed: ['Swift', 'Quick', 'Speedy'],
  maxHp: ['Stalwart', 'Stout', 'Hale'],
  armor: ['Bulwark', 'Ironclad', 'Steeled'],
  hpRegen: ['Vigorous', 'Mending', 'Vital'],
  percentHealing: ['Blessed', 'Sanctified', 'Restoring'],
  magnet: ['Magnetic', 'Gravitic', 'Lodestone'],
  luck: ['Lucky', 'Fortunate', 'Charmed'],
  percentGold: ['Gilded', 'Opulent', 'Greedy'],
  pickupRadius: ['Reach', 'Longhand', 'Grasping'],
  percentXp: ['Learned', 'Sage', 'Studious'],
  allStats: ['Exalted', 'Omni', 'Balanced'],
  ricochetDamage: ['Bouncing', 'Ricocheting', 'Rebounding'],
};

const SUFFIX_AFFIX_NAMES: Record<AffixType, string[]> = {
  flatDamage: ['of Carnage', 'of Slaughter', 'of Gore'],
  percentDamage: ['of the Butcher', 'of Ruin', 'of the Reaper'],
  areaFlat: ['of the Inferno', 'of the Blast', 'of the Tempest'],
  areaPercent: ['of the Maelstrom', 'of the Cataclysm', 'of the Furnace'],
  cooldownReduction: ['of Haste', 'of Pacing', 'of the Moment'],
  projectiles: ['of the Volley', 'of Shards', 'of Splinters'],
  pierce: ['of Penetration', 'of the Spear', 'of Skewers'],
  duration: ['of Persistence', 'of Echoes', 'of the Long Night'],
  speed: ['of Swiftness', 'of the Gale', 'of Quickstep'],
  projectileSpeed: ['of Velocity', 'of Haste', 'of Gale'],
  maxHp: ['of the Ox', 'of the Mountain', 'of the Colossus'],
  armor: ['of the Bastion', 'of the Ward', 'of the Citadel'],
  hpRegen: ['of Renewal', 'of the Grove', 'of the Spring'],
  percentHealing: ['of Grace', 'of Mercy', 'of Benediction'],
  magnet: ['of the Lodestone', 'of Pull', 'of the Anchor'],
  luck: ['of Fortune', 'of the Coin', 'of Serendipity'],
  percentGold: ['of Plunder', 'of the Hoard', 'of Riches'],
  pickupRadius: ['of Reach', 'of the Hook', 'of the Hand'],
  percentXp: ['of Wisdom', 'of the Scholar', 'of Insight'],
  allStats: ['of Balance', 'of the Trinity', 'of the Whole'],
  ricochetDamage: ['of Rebound', 'of Ricochet', 'of Reflection'],
};

type RolledAffix = { affix: ItemAffix; weight: number };

function pickWeightedIndex(weights: number[], random: () => number): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const roll = random() * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (roll <= acc) return i;
  }
  return weights.length - 1;
}

function rollRarity(luck: number, random: () => number): ItemRarity {
  const weights = RARITY_ORDER.map(rarity => {
    const factor = RARITY_LUCK_FACTORS[rarity];
    return RARITY_WEIGHTS[rarity] * (1 + (luck / 100) * factor);
  });
  return RARITY_ORDER[pickWeightedIndex(weights, random)];
}

function applyRarityBoost(rarity: ItemRarity, rarityBoost: number): ItemRarity {
  if (!rarityBoost) return rarity;
  const index = RARITY_ORDER.indexOf(rarity);
  const boostedIndex = Math.min(index + rarityBoost, RARITY_ORDER.length - 1);
  return RARITY_ORDER[boostedIndex];
}

function rollAffixCount(rarity: ItemRarity, random: () => number): number {
  const table = AFFIX_COUNT_TABLE[rarity];
  const index = pickWeightedIndex(table.weights, random);
  return table.options[index];
}

function getTierBounds(rarity: ItemRarity): { min: number; max: number } {
  switch (rarity) {
    case 'common':
      return { min: 1, max: 2 };
    case 'magic':
      return { min: 1, max: 3 };
    case 'rare':
      return { min: 2, max: 4 };
    case 'legendary':
    case 'corrupted':
      return { min: 2, max: 5 };
  }
}

function rollAffixTier(definition: AffixDefinition, rarity: ItemRarity, random: () => number): { tier: number; value: number } {
  const { min: minTier, max: maxTier } = getTierBounds(rarity);
  const available: Array<{ tier: number; weight: number; value: number }> = [];

  definition.tiers.forEach((value, idx) => {
    const tier = idx + 1;
    if (value === null || tier < minTier || tier > maxTier) return;
    available.push({ tier, weight: AFFIX_TIER_WEIGHTS[idx] || 0, value });
  });

  const weights = available.map(entry => entry.weight);
  const selected = available[pickWeightedIndex(weights, random)];
  const bracket = AFFIX_TIER_BRACKETS[definition.type]?.[selected.tier - 1];
  if (!bracket) {
    return { tier: selected.tier, value: selected.value };
  }

  const min = bracket.min;
  const max = bracket.max;
  const isIntegerRange = Number.isInteger(min) && Number.isInteger(max);
  if (isIntegerRange) {
    const value = Math.floor(random() * (max - min + 1)) + min;
    return { tier: selected.tier, value };
  }

  const raw = min + (max - min) * random();
  const value = Math.round(raw * 10) / 10;
  return { tier: selected.tier, value };
}

function pickNamePart(
  affixes: RolledAffix[],
  names: Record<AffixType, string[]>,
  random: () => number
): string | null {
  const candidates = affixes.filter(({ affix }) => affix.type in names);
  if (candidates.length === 0) return null;
  const best = candidates.reduce((current, next) => {
    if (next.affix.tier > current.affix.tier) return next;
    if (next.affix.tier < current.affix.tier) return current;
    if (next.weight > current.weight) return next;
    return current;
  });
  const pool = names[best.affix.type];
  return pool[Math.floor(random() * pool.length)];
}

function buildName(
  itemType: ItemType,
  baseName: string,
  rarity: ItemRarity,
  affixes: RolledAffix[],
  random: () => number
): string {
  let prefix = null;
  let suffix = null;

  if (itemType !== 'relic') {
    prefix = pickNamePart(affixes, PREFIX_AFFIX_NAMES, random);
    suffix = pickNamePart(affixes, SUFFIX_AFFIX_NAMES, random);
  }

  if (!prefix) {
    const prefixPool = PREFIXES[rarity];
    prefix = prefixPool[Math.floor(random() * prefixPool.length)];
  }

  if (!suffix) {
    const suffixPool = SUFFIXES[rarity];
    suffix = suffixPool[Math.floor(random() * suffixPool.length)];
  }

  return `${prefix} ${baseName} ${suffix}`;
}

function createId(random: () => number): string {
  const nonce = Math.floor(random() * 1e9);
  return `item-${Date.now()}-${nonce}`;
}

function collectAffixPool(itemType: ItemType): AffixDefinition[] {
  return [...AFFIX_POOLS[itemType], ...UNIVERSAL_AFFIXES];
}

export class ItemGenerator {
  static generateRelic(options: GenerateOptions): Item {
    const { classId, random = Math.random, enemyType = 'basic', relicId } = options;
    let resolvedClassId = classId;
    let relic = relicId ? getRelicDefinitionById(relicId) : undefined;

    if (relicId && !relic) {
      throw new Error(`Relic '${relicId}' not found.`);
    }

    if (relic) {
      if (classId && relic.classId !== classId) {
        throw new Error(`Relic '${relicId}' does not match class '${classId}'.`);
      }
      resolvedClassId = relic.classId;
    }

    if (!resolvedClassId) {
      throw new Error('Relic generation requires classId.');
    }

    if (!relic) {
      const pool = getRelicsForClass(resolvedClassId);
      if (pool.length === 0) {
        throw new Error(`No relics available for class '${resolvedClassId}'.`);
      }
      relic = rollWeightedRelic(pool, random, enemyType === 'boss');
    }
    const rarity: ItemRarity = 'legendary';
    const affixCount = rollAffixCount(rarity, random);
    const affixPool = collectAffixPool('relic');
    const affixes: ItemAffix[] = [];
    const remaining = [...affixPool];

    for (let i = 0; i < affixCount && remaining.length > 0; i++) {
      const weights = remaining.map(entry => entry.weight);
      const index = pickWeightedIndex(weights, random);
      const definition = remaining.splice(index, 1)[0];
      const { tier, value } = rollAffixTier(definition, rarity, random);
      const affix: ItemAffix = {
        type: definition.type,
        tier,
        value,
        isPercent: definition.isPercent,
      };
      affixes.push(affix);
    }

    return {
      id: createId(random),
      name: relic.name,
      baseId: relic.id,
      baseName: relic.name,
      tier: MAX_BASE_TIER,
      type: 'relic',
      rarity,
      affixes,
      implicits: [],
      baseTint: relic.tint,
      relicId: relic.id,
      relicClassId: relic.classId,
      relicEffectId: relic.effect.id,
      relicEffectName: relic.effect.name,
      relicEffectDescription: relic.effect.description,
    };
  }

  static generate(options: GenerateOptions): Item {
    const {
      itemType,
      luck,
      rarityBoost = 0,
      random = Math.random,
      minutesElapsed = 0,
      enemyType = 'basic',
      baseTier,
    } = options;

    if (itemType === 'relic') {
      return this.generateRelic(options);
    }

    const rolledRarity = rollRarity(luck, random);
    const rarity = applyRarityBoost(rolledRarity, rarityBoost);
    const tier = typeof baseTier === 'number' ? baseTier : rollBaseTier(minutesElapsed, enemyType, random);
    const base = getBaseByTier(itemType, tier, random);
    const affixCount = rollAffixCount(rarity, random);
    const pool = collectAffixPool(itemType);
    const affixes: ItemAffix[] = [];
    const rolledAffixes: RolledAffix[] = [];
    const remaining = [...pool];

    for (let i = 0; i < affixCount && remaining.length > 0; i++) {
      const weights = remaining.map(entry => entry.weight);
      const index = pickWeightedIndex(weights, random);
      const definition = remaining.splice(index, 1)[0];
      const { tier, value } = rollAffixTier(definition, rarity, random);
      const affix: ItemAffix = {
        type: definition.type,
        tier,
        value,
        isPercent: definition.isPercent,
      };
      affixes.push(affix);
      rolledAffixes.push({ affix, weight: definition.weight });
    }

    return {
      id: createId(random),
      name: buildName(itemType, base.name, rarity, rolledAffixes, random),
      baseId: base.id,
      baseName: base.name,
      tier: base.tier,
      type: itemType,
      rarity,
      affixes,
      implicits: base.implicits,
      baseTint: base.tint,
    };
  }

  static generateCorrupted(options: GenerateOptions): Item {
    if (options.itemType === 'relic') {
      return this.generate(options);
    }
    const item = this.generate({ ...options, rarityBoost: 3 }); // Force legendary stats
    item.rarity = 'corrupted';

    // Add exactly one drawback affix
    const pool = collectAffixPool(item.type);
    const random = options.random || Math.random;
    const definition = pool[Math.floor(random() * pool.length)];

    const { tier } = rollAffixTier(definition, 'legendary', random);
    const bracket = AFFIX_TIER_BRACKETS[definition.type]?.[tier - 1];

    // Corrupted items have negative values for the last affix
    const baseValue = bracket ? (bracket.min + bracket.max) / 2 : 10;
    const drawback: ItemAffix = {
      type: definition.type,
      tier,
      value: -Math.abs(baseValue) * 1.5, // Significant drawback
      isPercent: definition.isPercent,
    };

    item.affixes.push(drawback);
    item.name = `Corrupted ${item.name}`;

    return item;
  }
}

export const _test = {
  rollRarity,
  rollAffixCount,
  rollAffixTier,
  applyRarityBoost,
};
