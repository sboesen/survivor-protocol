import {
  AFFIX_COUNT_TABLE,
  AFFIX_POOLS,
  AFFIX_TIER_WEIGHTS,
  RARITY_LUCK_FACTORS,
  RARITY_ORDER,
  RARITY_WEIGHTS,
  UNIVERSAL_AFFIXES,
} from './affixTables';
import type { AffixDefinition, GenerateOptions, Item, ItemAffix, ItemRarity, ItemType } from './types';

const NAME_BASES: Record<ItemType, string[]> = {
  weapon: ['Blade', 'Axe', 'Scepter', 'Bow', 'Dagger'],
  helm: ['Helm', 'Visor', 'Hood', 'Crown'],
  armor: ['Cuirass', 'Robe', 'Plate', 'Tunic'],
  accessory: ['Ring', 'Amulet', 'Charm', 'Talisman'],
};

const PREFIXES: Record<ItemRarity, string[]> = {
  common: ['Plain', 'Worn', 'Simple'],
  magic: ['Mystic', 'Gleaming', 'Enchanted'],
  rare: ['Vicious', 'Royal', 'Grim'],
  legendary: ['Mythic', 'Ancient', 'Legendary'],
};

const SUFFIXES: Record<ItemRarity, string[]> = {
  common: ['of Sparks', 'of Dust', 'of Echoes'],
  magic: ['of Embers', 'of Frost', 'of Insight'],
  rare: ['of Ruin', 'of Valor', 'of Shadows'],
  legendary: ['of the Phoenix', 'of Eternity', 'of the Void'],
};

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

function rollAffixTier(definition: AffixDefinition, rarity: ItemRarity, random: () => number): { tier: number; value: number } {
  const minTier = rarity === 'legendary' ? 2 : 1;
  const available: Array<{ tier: number; weight: number; value: number }> = [];

  definition.tiers.forEach((value, idx) => {
    const tier = idx + 1;
    if (value === null || tier < minTier) return;
    available.push({ tier, weight: AFFIX_TIER_WEIGHTS[idx] || 0, value });
  });

  const weights = available.map(entry => entry.weight);
  const selected = available[pickWeightedIndex(weights, random)];
  return { tier: selected.tier, value: selected.value };
}

function buildName(itemType: ItemType, rarity: ItemRarity, random: () => number): string {
  const base = NAME_BASES[itemType];
  const baseName = base[Math.floor(random() * base.length)];
  const prefixPool = PREFIXES[rarity];
  const suffixPool = SUFFIXES[rarity];
  const prefix = prefixPool[Math.floor(random() * prefixPool.length)];
  const suffix = suffixPool[Math.floor(random() * suffixPool.length)];
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
  static generate(options: GenerateOptions): Item {
    const {
      itemType,
      luck,
      rarityBoost = 0,
      random = Math.random,
    } = options;

    const rolledRarity = rollRarity(luck, random);
    const rarity = applyRarityBoost(rolledRarity, rarityBoost);
    const affixCount = rollAffixCount(rarity, random);
    const pool = collectAffixPool(itemType);
    const affixes: ItemAffix[] = [];
    const remaining = [...pool];

    for (let i = 0; i < affixCount && remaining.length > 0; i++) {
      const weights = remaining.map(entry => entry.weight);
      const index = pickWeightedIndex(weights, random);
      const definition = remaining.splice(index, 1)[0];
      const { tier, value } = rollAffixTier(definition, rarity, random);
      affixes.push({
        type: definition.type,
        tier,
        value,
        isPercent: definition.isPercent,
      });
    }

    return {
      id: createId(random),
      name: buildName(itemType, rarity, random),
      type: itemType,
      rarity,
      affixes,
    };
  }
}

export const _test = {
  rollRarity,
  rollAffixCount,
  rollAffixTier,
  applyRarityBoost,
};
