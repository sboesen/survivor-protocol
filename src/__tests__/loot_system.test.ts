import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ItemGenerator } from '../items/generator';
import { CraftingSystem } from '../systems/crafting';
import { SaveData } from '../systems/saveData';
import { Stash } from '../items/stash';

// Mock SaveData and Stash for testing
vi.mock('../systems/saveData', () => ({
    SaveData: {
        data: {
            stash: [],
            scrap: 0,
            shop: { safeSlotsCount: 1 }
        },
        save: vi.fn(),
    },
}));

describe('Loot System Expansion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        SaveData.data.stash = [];
        SaveData.data.scrap = 0;
    });

    describe('Corrupted Items', () => {
        it('should generate an item with legendary-tier stats plus a drawback', () => {
            const item = ItemGenerator.generateCorrupted({
                itemType: 'weapon',
                luck: 0,
            });

            expect(item.rarity).toBe('corrupted');
            expect(item.name).toContain('Corrupted');
            expect(item.affixes.length).toBeGreaterThan(4);

            const hasDrawback = item.affixes.some(a => a.value < 0);
            expect(hasDrawback).toBe(true);
        });
    });

    describe('Crafting System (Salvage)', () => {
        it('should grant scrap and remove item from stash', () => {
            const item = ItemGenerator.generate({ itemType: 'weapon', luck: 0 });
            item.rarity = 'rare';

            const stash = new Stash(200);
            stash.addItem(item);
            SaveData.data.stash = stash.toJSON();

            const initialScrap = SaveData.data.scrap;
            const expectedScrap = CraftingSystem.getSalvageValue('rare');

            const granted = CraftingSystem.salvage(0);

            expect(granted).toBe(expectedScrap);
            expect(SaveData.data.scrap).toBe(initialScrap + expectedScrap);

            const updatedStash = Stash.fromJSON(SaveData.data.stash);
            expect(updatedStash.slots[0]).toBeNull();
            expect(SaveData.save).toHaveBeenCalled();
        });

        it('should return 0 if slot is empty', () => {
            const stash = new Stash(200);
            SaveData.data.stash = stash.toJSON();

            const granted = CraftingSystem.salvage(0);
            expect(granted).toBe(0);
            expect(SaveData.data.scrap).toBe(0);
        });
    });
});
