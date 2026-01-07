import type { SaveGameData } from '../types';
import { Stash } from '../items/stash';

const WIPE_LEGACY_DATA = true;

const createDefaultSaveData = (): SaveGameData => ({
  gold: 0,
  ownedChars: ['wizard'],
  selectedChar: 'wizard',
  shop: { damage: 0, health: 0, speed: 0, magnet: 0 },
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
    if (saved && WIPE_LEGACY_DATA) {
      localStorage.removeItem(this.key);
      this.data = createDefaultSaveData();
      this.save();
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<SaveGameData>;

        this.data = {
          gold: parsed.gold ?? 0,
          ownedChars: parsed.ownedChars ?? ['wizard'],
          selectedChar: parsed.selectedChar ?? 'wizard',
          shop: {
            damage: parsed.shop?.damage ?? 0,
            health: parsed.shop?.health ?? 0,
            speed: parsed.shop?.speed ?? 0,
            magnet: parsed.shop?.magnet ?? 0,
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
