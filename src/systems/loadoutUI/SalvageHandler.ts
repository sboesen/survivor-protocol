import type { StashSlot, ItemRarity } from '../../items/types';
import { CraftingSystem } from '../crafting';

export class SalvageHandler {
  private salvageHoldTimer: number | null = null;
  private salvageHoldInterval: number | null = null;
  private salvageHoldStartTime: number = 0;
  private isSalvageMode = false;

  toggleSalvageMode(): void {
    this.isSalvageMode = !this.isSalvageMode;
    document.body.style.cursor = this.isSalvageMode ? 'url(/weapons/hammer.png), crosshair' : '';
  }

  getIsSalvageMode(): boolean {
    return this.isSalvageMode;
  }

  handleSalvageClick(index: number, stash: StashSlot[]): void {
    const item = stash[index];
    if (!item) return;
    CraftingSystem.salvage(index);
  }

  private stopSalvageHold(progressEl: HTMLElement): void {
    if (this.salvageHoldTimer) {
      window.clearTimeout(this.salvageHoldTimer);
      this.salvageHoldTimer = null;
    }
    if (this.salvageHoldInterval) {
      window.clearInterval(this.salvageHoldInterval);
      this.salvageHoldInterval = null;
    }
    progressEl.style.width = '0%';
  }

  startBulkSalvageHold(rarities: ItemRarity[], progressEl: HTMLElement, btnEl: HTMLElement): void {
    this.stopSalvageHold(progressEl);

    const DURATION = 1200;
    this.salvageHoldStartTime = Date.now();

    this.salvageHoldInterval = window.setInterval(() => {
      const elapsed = Date.now() - this.salvageHoldStartTime;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      progressEl.style.width = `${pct}%`;
    }, 16);

    this.salvageHoldTimer = window.setTimeout(() => {
      this.stopSalvageHold(progressEl);
      btnEl.classList.add('complete');
      setTimeout(() => {
        const result = CraftingSystem.salvageAllByRarity(rarities);
        console.log(`Salvaged ${result.count} items for ${result.scrap} scrap.`);
      }, 150);
    }, DURATION);
  }
}
