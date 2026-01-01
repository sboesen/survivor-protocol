import type { SaveGameData } from '../types';

class SaveDataSystem {
  private readonly key = 'survivor_protocol_v2';

  data: SaveGameData = {
    gold: 0,
    ownedChars: ['dungeonMaster'],
    selectedChar: 'dungeonMaster',
    shop: { damage: 0, health: 0, speed: 0, magnet: 0 }
  };

  load(): void {
    const saved = localStorage.getItem(this.key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<SaveGameData>;

        // Deep merge to preserve all data and handle new properties
        this.data = {
          gold: parsed.gold ?? 0,
          ownedChars: parsed.ownedChars ?? ['dungeonMaster'],
          selectedChar: parsed.selectedChar ?? 'dungeonMaster',
          shop: {
            damage: parsed.shop?.damage ?? 0,
            health: parsed.shop?.health ?? 0,
            speed: parsed.shop?.speed ?? 0,
            magnet: parsed.shop?.magnet ?? 0,
          }
        };

        // Ensure selectedChar is in ownedChars
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
