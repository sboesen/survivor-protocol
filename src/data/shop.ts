import type { ShopItem } from '../types';

export const SHOP_ITEMS: Record<string, ShopItem> = {
  damage: { name: "Might", desc: "+10% Dmg", cost: (l) => 100 * (l + 1), max: 5 },
  health: { name: "Vitality", desc: "+20 HP", cost: (l) => 80 * (l + 1), max: 5 },
  speed: { name: "Haste", desc: "+5% Spd", cost: (l) => 150 * (l + 1), max: 3 },
  magnet: { name: "Magnet", desc: "+20% Rng", cost: (l) => 100 * (l + 1), max: 3 },
  safeSlots: { name: "Safe Container", desc: "+1 Auto-Safe Slot", cost: (l) => l === 1 ? 500 : (l === 2 ? 1000 : l * 1000), max: 5 }
};
