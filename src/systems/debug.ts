import { SaveData } from './saveData';
import { CHARACTERS } from '../data/characters';

class DebugSystem {
  addGold(amt: number): void {
    SaveData.data.gold += amt;
    SaveData.save();

    const gachaGold = document.getElementById('gacha-gold');
    const shopGold = document.getElementById('shop-gold-display');

    if (gachaGold) gachaGold.textContent = SaveData.data.gold.toString();
    if (shopGold) shopGold.textContent = SaveData.data.gold.toString();
  }

  unlockAll(): void {
    SaveData.data.ownedChars = Object.keys(CHARACTERS);
    SaveData.save();
  }

  resetProgress(): void {
    if (confirm('THIS WILL ERASE EVERYTHING! Continue?')) {
      localStorage.removeItem('survivor_proto_v2_3');
      location.reload();
    }
  }
}

export const Debug = new DebugSystem();
