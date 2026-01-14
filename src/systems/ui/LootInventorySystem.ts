import type { Item } from '../../items/types';

export class LootInventorySystem {
  showLootInventory(items: Item[], safeSlotCount: number): void {
    const screen = document.getElementById('loot-inventory-screen');
    const grid = document.getElementById('loot-inventory-grid');
    const securedEl = document.getElementById('loot-secure-slot');
    if (screen) screen.classList.add('active');
    if (securedEl) {
      const itemsWillSecure = Math.min(items.length, safeSlotCount);
      securedEl.textContent = `Auto-Safe Slots: ${itemsWillSecure}/${safeSlotCount}`;
    }

    if (!grid) return;
    grid.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'loot-empty';
      empty.textContent = 'No loot collected.';
      grid.appendChild(empty);
      return;
    }

    const typeIcon = (type: string): string => {
      switch (type) {
        case 'weapon':
          return '🗡';
        case 'helm':
          return '🪖';
        case 'armor':
          return '🛡';
        case 'accessory':
          return '💍';
        case 'relic':
          return '⭐';
        default:
          return '❔';
      }
    };

    items.forEach(item => {
      const button = document.createElement('button');
      button.className = `loot-item rarity-${item.rarity} ${item.type === 'relic' ? 'type-relic' : ''}`;
      button.innerHTML = `
        ${item.type === 'relic' ? '<span class="loot-badge">★</span>' : ''}
        <span class="loot-icon">${typeIcon(item.type)}</span>
        <span class="loot-name">${item.rarity.toUpperCase()} ${item.type.toUpperCase()}</span>
        <span class="loot-meta">VEILED</span>
      `;
      grid.appendChild(button);
    });
  }

  hideLootInventory(): void {
    const screen = document.getElementById('loot-inventory-screen');
    if (screen) screen.classList.remove('active');
  }
}
