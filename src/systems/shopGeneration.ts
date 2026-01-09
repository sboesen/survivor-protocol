import { ItemGenerator } from '../items/generator';
import type { ItemRarity, ItemType } from '../items/types';
import type { ShopItemListing } from '../types';
import { calculateShopPrice } from '../data/shop';

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateShopInventory(now = Date.now()): {
  items: ShopItemListing[];
  gamblerItems: ShopItemListing[];
} {
  const items: ShopItemListing[] = [];
  const gamblerItems: ShopItemListing[] = [];

  const itemCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < itemCount; i++) {
    const veiled = Math.random() < 0.3;
    const type = randomItemType();

    if (veiled) {
      const rarity = rollRarity();
      items.push(createListing({
        item: null,
        veiled: true,
        rarity,
        type,
        now,
      }));
    } else {
      const item = ItemGenerator.generate({ itemType: type, luck: 0 });
      items.push(createListing({
        item,
        veiled: false,
        rarity: item.rarity,
        type: item.type,
        now,
      }));
    }
  }

  const gamblerCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < gamblerCount; i++) {
    const rarityRoll = Math.random();
    const rarity = rarityRoll < 0.05 ? 'corrupted' : rollRarity(); // 5% chance for corrupted in gambler
    const type = randomItemType();

    // Gambler items are always veiled in the shop inventory data initially
    // but the ShopManager will generate the item on purchase.
    gamblerItems.push(createListing({
      item: null,
      veiled: true,
      rarity,
      type,
      now,
    }));
  }

  return { items, gamblerItems };
}

function createListing(args: {
  item: ShopItemListing['item'];
  veiled: boolean;
  rarity: ItemRarity;
  type: ItemType;
  now: number;
}): ShopItemListing {
  const { item, veiled, rarity, type, now } = args;
  return {
    item,
    veiled,
    rarity,
    type,
    price: calculateShopPrice(rarity, veiled),
    listedAt: now,
    expiresAt: now + DAY_MS,
  };
}

function rollRarity(): ItemRarity {
  const roll = Math.random();
  if (roll < 0.5) return 'common';
  if (roll < 0.8) return 'magic';
  if (roll < 0.95) return 'rare';
  return 'legendary';
}

function randomItemType(): ItemType {
  const types: ItemType[] = ['weapon', 'helm', 'armor', 'accessory', 'relic', 'offhand'];
  return types[Math.floor(Math.random() * types.length)];
}
