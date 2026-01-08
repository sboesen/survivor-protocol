import type { StashSlot } from '../items/types';
import { CraftingSystem } from './crafting';
import { SaveData } from './saveData';

class StashUISystem {
  private selectedIndex: number | null = null;

  render(stash: StashSlot[]): void {
    const grid = document.getElementById('stash-grid');
    const detail = document.getElementById('stash-detail');
    if (!grid) return;

    grid.innerHTML = '';

    stash.forEach((slot, index) => {
      const cell = document.createElement('div');
      cell.className = 'stash-slot';
      if (index === this.selectedIndex) cell.classList.add('selected');

      if (slot) {
        cell.classList.add('filled');
        cell.textContent = slot.name;
      }

      cell.onclick = () => {
        this.selectedIndex = index;
        this.render(stash);
        if (detail) {
          detail.innerHTML = '';
          if (slot) {
            const title = document.createElement('div');
            title.textContent = `${slot.name} (${slot.rarity.toUpperCase()})`;
            detail.appendChild(title);

            const salvageBtn = document.createElement('button');
            const value = CraftingSystem.getSalvageValue(slot.rarity);
            salvageBtn.textContent = `Salvage for ${value} Scrap`;
            salvageBtn.className = 'btn-salvage';
            salvageBtn.onclick = (e) => {
              e.stopPropagation();
              if (confirm(`Really salvage ${slot.name}?`)) {
                CraftingSystem.salvage(index);
                this.selectedIndex = null;
                this.render(SaveData.data.stash);
              }
            };
            detail.appendChild(salvageBtn);
          } else {
            detail.textContent = 'Empty slot.';
          }
        }
      };

      grid.appendChild(cell);
    });

    if (detail && this.selectedIndex === null) {
      detail.textContent = 'Select an item to inspect.';
    }
  }
}

export const StashUI = new StashUISystem();
