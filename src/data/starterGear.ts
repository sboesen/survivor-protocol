import type { Item, ItemRarity } from '../items/types';

export interface StarterGearSet {
    weapon: Partial<Item>;
    armor: Partial<Item>;
    accessory: Partial<Item>;
}

export const STARTER_GEAR: Record<string, StarterGearSet> = {
    wizard: {
        weapon: {
            name: 'Apprentice Wand',
            baseName: 'Wand',
            type: 'weapon',
            rarity: 'common' as ItemRarity,
            tier: 1,
            affixes: [{ type: 'percentDamage', tier: 1, value: 10, isPercent: true }],
            implicits: [{ type: 'flatDamage', tier: 1, value: 2 }]
        },
        armor: {
            name: 'Tattered Robe',
            baseName: 'Robe',
            type: 'armor',
            rarity: 'common' as ItemRarity,
            tier: 1,
            affixes: [{ type: 'maxHp', tier: 1, value: 20 }],
            implicits: [{ type: 'armor', tier: 1, value: 1 }]
        },
        accessory: {
            name: 'Rusty Compass',
            baseName: 'Compass',
            type: 'accessory',
            rarity: 'common' as ItemRarity,
            tier: 1,
            affixes: [{ type: 'magnet', tier: 1, value: 20 }],
            implicits: [{ type: 'speed', tier: 1, value: 0.5 }]
        }
    },
    paladin: {
        weapon: {
            name: 'Wooden Reliquary',
            baseName: 'Relic',
            type: 'weapon',
            rarity: 'common' as ItemRarity,
            tier: 1,
            affixes: [{ type: 'areaPercent', tier: 1, value: 15, isPercent: true }],
            implicits: [{ type: 'hpRegen', tier: 1, value: 0.5 }]
        },
        armor: {
            name: 'Rusty Plate',
            baseName: 'Plate',
            type: 'armor',
            rarity: 'common' as ItemRarity,
            tier: 1,
            affixes: [{ type: 'armor', tier: 1, value: 2 }],
            implicits: [{ type: 'maxHp', tier: 1, value: 50 }]
        },
        accessory: {
            name: 'Iron Rosary',
            baseName: 'Rosary',
            type: 'accessory',
            rarity: 'common' as ItemRarity,
            tier: 1,
            affixes: [{ type: 'percentHealing', tier: 1, value: 15, isPercent: true }],
            implicits: [{ type: 'armor', tier: 1, value: 1 }]
        }
    },
    rogue: {
        weapon: {
            name: 'Dull Shiv',
            baseName: 'Dagger',
            type: 'weapon',
            rarity: 'common' as ItemRarity,
            tier: 1,
            affixes: [{ type: 'speed', tier: 1, value: 5 }],
            implicits: [{ type: 'flatDamage', tier: 1, value: 1 }]
        },
        armor: {
            name: 'Worn Leather',
            baseName: 'Leather',
            type: 'armor',
            rarity: 'common' as ItemRarity,
            tier: 1,
            affixes: [{ type: 'speed', tier: 1, value: 10 }],
            implicits: [{ type: 'maxHp', tier: 1, value: 30 }]
        },
        accessory: {
            name: 'Lucky Coin',
            baseName: 'Coin',
            type: 'accessory',
            rarity: 'common' as ItemRarity,
            tier: 1,
            affixes: [{ type: 'luck', tier: 1, value: 10 }],
            implicits: [{ type: 'percentGold', tier: 1, value: 10, isPercent: true }]
        }
    }
    // Others can be added as needed, defaulting to empty or basic sets.
};

export const DEFAULT_STARTER: StarterGearSet = {
    weapon: {
        name: 'Basic Weapon',
        baseName: 'Weapon',
        type: 'weapon',
        rarity: 'common' as ItemRarity,
        tier: 1,
        affixes: [{ type: 'percentDamage', tier: 1, value: 5, isPercent: true }],
        implicits: []
    },
    armor: {
        name: 'Basic Armor',
        baseName: 'Armor',
        type: 'armor',
        rarity: 'common' as ItemRarity,
        tier: 1,
        affixes: [{ type: 'maxHp', tier: 1, value: 10 }],
        implicits: []
    },
    accessory: {
        name: 'Basic Trinket',
        baseName: 'Accessory',
        type: 'accessory',
        rarity: 'common' as ItemRarity,
        tier: 1,
        affixes: [{ type: 'speed', tier: 1, value: 2 }],
        implicits: []
    }
};
