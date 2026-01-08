import type { SaveGameData, ShopInventoryData } from '../types';
import { Stash } from '../items/stash';

// Map old character IDs to new fantasy-themed IDs
const CHARACTER_MIGRATION: Record<string, string> = {
  dungeonMaster: 'wizard',
  janitor: 'paladin',
  skater: 'rogue',
  mallCop: 'knight',
  foodCourt: 'berserker',
  teenager: 'pyromancer',
};

const createDefaultShopInventory = (): ShopInventoryData => ({
  items: [],
  gamblerItems: [],
  lastRefresh: 0,
  lastDailyRefresh: 0,
});

const createDefaultSaveData = (): SaveGameData => ({
  gold: 0,
  scrap: 0,
  ownedChars: ['wizard'],
  selectedChar: 'wizard',
  isFirstSuccessfulRun: true,
  shop: { damage: 0, health: 0, speed: 0, magnet: 0, safeSlotsCount: 1 },
  shopInventory: createDefaultShopInventory(),
  stash: new Stash().toJSON(),
  loadout: {
    relic: null,
    weapon: null,
    helm: null,
    armor: null,
    accessory1: null,
    accessory2: null,
    accessory3: null,
  },
});

class SaveDataSystem {
  private readonly key = 'survivor_protocol_v2';

  data: SaveGameData = createDefaultSaveData();

  load(): void {
    const saved = localStorage.getItem(this.key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<SaveGameData>;

        const needsMigration = (parsed.ownedChars ?? []).some(
          charId => charId in CHARACTER_MIGRATION
        ) || (parsed.selectedChar && parsed.selectedChar in CHARACTER_MIGRATION);

        const migratedOwnedChars = (parsed.ownedChars ?? ['wizard']).map(
          charId => CHARACTER_MIGRATION[charId] || charId
        );
        const migratedSelectedChar = CHARACTER_MIGRATION[parsed.selectedChar ?? 'wizard'] || parsed.selectedChar || 'wizard';

        this.data = {
          gold: parsed.gold ?? 0,
          scrap: (parsed as any).scrap ?? 0,
          ownedChars: migratedOwnedChars,
          selectedChar: migratedSelectedChar,
          isFirstSuccessfulRun: (parsed as any).isFirstSuccessfulRun ?? true,
          shop: {
            damage: parsed.shop?.damage ?? 0,
            health: parsed.shop?.health ?? 0,
            speed: parsed.shop?.speed ?? 0,
            magnet: parsed.shop?.magnet ?? 0,
            safeSlotsCount: parsed.shop?.safeSlotsCount ?? 1,
          },
          shopInventory: {
            items: parsed.shopInventory?.items ?? [],
            gamblerItems: parsed.shopInventory?.gamblerItems ?? [],
            lastRefresh: parsed.shopInventory?.lastRefresh ?? 0,
            lastDailyRefresh: parsed.shopInventory?.lastDailyRefresh ?? parsed.shopInventory?.lastRefresh ?? 0,
          },
          stash: Stash.fromJSON(parsed.stash).toJSON(),
          loadout: {
            relic: parsed.loadout?.relic ?? null,
            weapon: parsed.loadout?.weapon ?? null,
            helm: parsed.loadout?.helm ?? null,
            armor: parsed.loadout?.armor ?? null,
            accessory1: parsed.loadout?.accessory1 ?? null,
            accessory2: parsed.loadout?.accessory2 ?? null,
            accessory3: parsed.loadout?.accessory3 ?? null,
          },
        };

        if (this.data.selectedChar && !this.data.ownedChars.includes(this.data.selectedChar)) {
          this.data.ownedChars.push(this.data.selectedChar);
        }

        if (needsMigration) {
          this.save();
        }
      } catch (e) {
        console.error('Failed to parse save data, using defaults:', e);
      }
    }
  }

  save(): void {
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }
}

export const SaveData = new SaveDataSystem();
