import type { SaveGameData } from '../types';

class SaveDataSystem {
  private readonly key = 'survivor_proto_v2_3';
  data: SaveGameData = {
    gold: 0,
    ownedChars: ['knight'],
    selectedChar: 'knight',
    shop: { damage: 0, health: 0, speed: 0, magnet: 0 }
  };

  load(): void {
    const saved = localStorage.getItem(this.key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.data = { ...this.data, ...parsed };
        if (!this.data.ownedChars) {
          this.data.ownedChars = ['knight'];
        }
      } catch (e) {
        console.error('Failed to parse save data:', e);
      }
    }
  }

  save(): void {
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }
}

export const SaveData = new SaveDataSystem();
