import { calculateShopPrice } from '../data/shop';
import { SaveData } from './saveData';
import { Stash } from '../items/stash';
import type { ItemRarity } from '../items/types';

const SELL_RATE = 0.4;

export class SellingSystem {
  static getSellValue(rarity: ItemRarity): number {
    return Math.max(1, Math.floor(calculateShopPrice(rarity, false) * SELL_RATE));
  }

  static sell(index: number): number {
    const stash = Stash.fromJSON(SaveData.data.stash);
    const item = stash.slots[index];
    if (!item) return 0;

    const amount = this.getSellValue(item.rarity);
    const removed = stash.removeItem(index);

    if (removed) {
      SaveData.data.gold += amount;
      SaveData.data.stash = stash.toJSON();
      SaveData.save();
      return amount;
    }

    return 0;
  }

  static sellAllByRarity(rarities: ItemRarity[]): { count: number; gold: number } {
    const stash = Stash.fromJSON(SaveData.data.stash);
    let count = 0;
    let totalGold = 0;

    for (let i = stash.slots.length - 1; i >= 0; i--) {
      const item = stash.slots[i];
      if (item && rarities.includes(item.rarity)) {
        const amount = this.getSellValue(item.rarity);
        stash.removeItem(i);
        count++;
        totalGold += amount;
      }
    }

    if (count > 0) {
      SaveData.data.gold += totalGold;
      SaveData.data.stash = stash.toJSON();
      SaveData.save();
    }

    return { count, gold: totalGold };
  }

  static previewSellAllByRarity(rarities: ItemRarity[]): { count: number; gold: number } {
    const stash = Stash.fromJSON(SaveData.data.stash);
    let count = 0;
    let totalGold = 0;

    for (let i = stash.slots.length - 1; i >= 0; i--) {
      const item = stash.slots[i];
      if (item && rarities.includes(item.rarity)) {
        const amount = this.getSellValue(item.rarity);
        count++;
        totalGold += amount;
      }
    }

    return { count, gold: totalGold };
  }

  static sellFiltered(filterFn: (item: any) => boolean): { count: number; gold: number } {
    const stash = Stash.fromJSON(SaveData.data.stash);
    let count = 0;
    let totalGold = 0;

    for (let i = stash.slots.length - 1; i >= 0; i--) {
      const item = stash.slots[i];
      if (item && filterFn(item)) {
        const amount = this.getSellValue(item.rarity);
        stash.removeItem(i);
        count++;
        totalGold += amount;
      }
    }

    if (count > 0) {
      SaveData.data.gold += totalGold;
      SaveData.data.stash = stash.toJSON();
      SaveData.save();
    }

    return { count, gold: totalGold };
  }

  static previewSellFiltered(filterFn: (item: any) => boolean): { count: number; gold: number } {
    const stash = Stash.fromJSON(SaveData.data.stash);
    let count = 0;
    let totalGold = 0;

    for (let i = stash.slots.length - 1; i >= 0; i--) {
      const item = stash.slots[i];
      if (item && filterFn(item)) {
        const amount = this.getSellValue(item.rarity);
        count++;
        totalGold += amount;
      }
    }

    return { count, gold: totalGold };
  }
}
