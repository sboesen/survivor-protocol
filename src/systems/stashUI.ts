import type { StashSlot } from '../items/types';

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
          if (slot) {
            detail.textContent = `${slot.name} (${slot.rarity})`;
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
