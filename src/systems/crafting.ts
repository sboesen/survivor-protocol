import { SaveData } from './saveData';
import { Stash } from '../items/stash';
import type { ItemRarity } from '../items/types';

const SCRAP_VALUES: Record<ItemRarity, number> = {
    common: 10,
    magic: 50,
    rare: 200,
    legendary: 1000,
    corrupted: 2500,
};

export class CraftingSystem {
    static salvage(index: number): number {
        const stash = Stash.fromJSON(SaveData.data.stash);
        const item = stash.slots[index];
        if (!item) return 0;

        const amount = SCRAP_VALUES[item.rarity] || 0;
        const removed = stash.removeItem(index);

        if (removed) {
            SaveData.data.scrap = (SaveData.data.scrap || 0) + amount;
            SaveData.data.stash = stash.toJSON();
            SaveData.save();
            return amount;
        }

        return 0;
    }

    static getSalvageValue(rarity: ItemRarity): number {
        return SCRAP_VALUES[rarity] || 0;
    }

    static salvageAllByRarity(rarities: ItemRarity[]): { count: number, scrap: number } {
        const stash = Stash.fromJSON(SaveData.data.stash);
        let count = 0;
        let totalScrap = 0;

        for (let i = stash.slots.length - 1; i >= 0; i--) {
            const item = stash.slots[i];
            if (item && rarities.includes(item.rarity)) {
                const scrap = SCRAP_VALUES[item.rarity] || 0;
                stash.removeItem(i);
                count++;
                totalScrap += scrap;
            }
        }

        if (count > 0) {
            SaveData.data.scrap = (SaveData.data.scrap || 0) + totalScrap;
            SaveData.data.stash = stash.toJSON();
            SaveData.save();
        }

        return { count, scrap: totalScrap };
    }
}
