import type { LoadoutData } from '../types';
import type { Item, ItemAffix, StashSlot } from '../items/types';
import {
  LOADOUT_SLOT_LABELS,
  LOADOUT_SLOT_ORDER,
  LOADOUT_SLOT_TYPES,
  type LoadoutSlotId,
  isSlotCompatible,
} from '../items/loadout';
import { SaveData } from './saveData';

type Selection =
  | { type: 'stash'; index: number }
  | { type: 'loadout'; slot: LoadoutSlotId };

class LoadoutUISystem {
  private selected: Selection | null = null;

  render(stash: StashSlot[], loadout: LoadoutData): void {
    const stashGrid = document.getElementById('stash-grid');
    const loadoutGrid = document.getElementById('loadout-grid');
    const tooltip = document.getElementById('loadout-tooltip');

    if (!stashGrid || !loadoutGrid) return;

    this.hideTooltip(tooltip);
    loadoutGrid.innerHTML = '';
    stashGrid.innerHTML = '';

    for (const slotId of LOADOUT_SLOT_ORDER) {
      const slotItem = loadout[slotId];
      const cell = document.createElement('div');
      cell.className = 'loadout-slot';

      if (this.selected?.type === 'loadout' && this.selected.slot === slotId) {
        cell.classList.add('selected');
      }

      if (slotItem) {
        cell.classList.add('filled');
      }

      const label = document.createElement('div');
      label.className = 'slot-label';
      label.textContent = LOADOUT_SLOT_LABELS[slotId];

      const body = document.createElement('div');
      body.className = 'slot-item';

      if (slotItem) {
        body.textContent = slotItem.name;
      } else if (LOADOUT_SLOT_TYPES[slotId] === 'relic') {
        body.textContent = 'Locked';
        cell.classList.add('locked');
      } else {
        body.textContent = 'Empty';
      }

      cell.appendChild(label);
      cell.appendChild(body);

      cell.onmouseenter = (event) => this.showTooltip({ type: 'loadout', slot: slotId }, tooltip, stash, loadout, event);
      cell.onmousemove = (event) => this.updateTooltipPosition(tooltip, event);
      cell.onmouseleave = () => this.hideTooltip(tooltip);
      cell.onfocus = () => this.showTooltip({ type: 'loadout', slot: slotId }, tooltip, stash, loadout, null, cell);
      cell.onblur = () => this.hideTooltip(tooltip);
      cell.onclick = () => {
        this.handleLoadoutClick(slotId, stash, loadout);
      };

      loadoutGrid.appendChild(cell);
    }

    stash.forEach((slot, index) => {
      const cell = document.createElement('div');
      cell.className = 'stash-slot';

      if (this.selected?.type === 'stash' && this.selected.index === index) {
        cell.classList.add('selected');
      }

      if (slot) {
        cell.classList.add('filled');
        cell.textContent = slot.name;
      }

      cell.onmouseenter = (event) => this.showTooltip({ type: 'stash', index }, tooltip, stash, loadout, event);
      cell.onmousemove = (event) => this.updateTooltipPosition(tooltip, event);
      cell.onmouseleave = () => this.hideTooltip(tooltip);
      cell.onfocus = () => this.showTooltip({ type: 'stash', index }, tooltip, stash, loadout, null, cell);
      cell.onblur = () => this.hideTooltip(tooltip);
      cell.onclick = () => {
        this.handleStashClick(index, stash, loadout);
      };

      stashGrid.appendChild(cell);
    });

    this.hideTooltip(tooltip);
  }

  private formatAffix(affix: ItemAffix): string {
    const labels: Record<ItemAffix['type'], string> = {
      flatDamage: 'Damage',
      percentDamage: 'Damage',
      areaFlat: 'Area',
      areaPercent: 'Area',
      cooldownReduction: 'Cooldown Reduction',
      projectiles: 'Projectiles',
      pierce: 'Pierce',
      duration: 'Duration',
      speed: 'Speed',
      maxHp: 'Max HP',
      armor: 'Armor',
      hpRegen: 'HP Regen',
      percentHealing: 'Healing',
      magnet: 'Magnet',
      luck: 'Luck',
      percentGold: 'Gold',
      pickupRadius: 'Pickup Radius',
      percentXp: 'XP',
      allStats: 'All Stats',
    };
    const sign = affix.value >= 0 ? '+' : '';
    const value = affix.isPercent ? `${affix.value}%` : `${affix.value}`;
    return `${sign}${value} ${labels[affix.type] ?? affix.type}`;
  }

  private populateDetail(detailEl: HTMLElement, item: Item): void {
    const title = document.createElement('div');
    title.className = 'loadout-detail-title';
    title.textContent = item.name;

    const meta = document.createElement('div');
    meta.className = 'loadout-detail-meta';
    meta.textContent = `${item.rarity.toUpperCase()} ${item.type.toUpperCase()}`;

    const stats = document.createElement('div');
    stats.className = 'loadout-detail-stats';

    if (item.affixes.length === 0) {
      stats.textContent = 'No affixes.';
    } else {
      item.affixes.forEach(affix => {
        const line = document.createElement('div');
        line.textContent = this.formatAffix(affix);
        stats.appendChild(line);
      });
    }

    detailEl.appendChild(title);
    detailEl.appendChild(meta);
    detailEl.appendChild(stats);
  }

  private renderDetail(
    detailEl: HTMLElement,
    selection: Selection,
    stash: StashSlot[],
    loadout: LoadoutData
  ): void {
    detailEl.innerHTML = '';

    if (selection.type === 'stash') {
      const item = stash[selection.index];
      if (!item) {
        return;
      }
      this.populateDetail(detailEl, item);
      return;
    }

    const slotId = selection.slot;
    const item = loadout[slotId];
    if (item) {
      this.populateDetail(detailEl, item);
      return;
    }

    if (LOADOUT_SLOT_TYPES[slotId] === 'relic') {
      detailEl.textContent = 'Relics unlock in a later phase.';
      return;
    }
  }

  private showTooltip(
    selection: Selection,
    tooltip: HTMLElement | null,
    stash: StashSlot[],
    loadout: LoadoutData,
    event?: MouseEvent | null,
    fallbackEl?: HTMLElement
  ): void {
    if (!tooltip) return;

    tooltip.innerHTML = '';
    this.renderDetail(tooltip, selection, stash, loadout);
    if (!tooltip.innerHTML) {
      this.hideTooltip(tooltip);
      return;
    }

    tooltip.style.display = 'block';
    this.updateTooltipPosition(tooltip, event ?? undefined, fallbackEl);
  }

  private updateTooltipPosition(
    tooltip: HTMLElement | null,
    event?: MouseEvent,
    fallbackEl?: HTMLElement
  ): void {
    if (!tooltip || tooltip.style.display === 'none') return;

    let x = 0;
    let y = 0;
    if (event) {
      x = event.clientX + 12;
      y = event.clientY + 12;
    } else if (fallbackEl) {
      const rect = fallbackEl.getBoundingClientRect();
      x = rect.right + 12;
      y = rect.top + 12;
    }

    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const maxX = window.innerWidth - width - 8;
    const maxY = window.innerHeight - height - 8;

    if (x > maxX) x = maxX;
    if (y > maxY) y = maxY;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  private hideTooltip(tooltip: HTMLElement | null): void {
    if (!tooltip) return;
    tooltip.innerHTML = '';
    tooltip.style.display = 'none';
  }

  private handleStashClick(index: number, stash: StashSlot[], loadout: LoadoutData): void {
    const clickedItem = stash[index];

    if (!this.selected) {
      if (clickedItem) {
        this.selected = { type: 'stash', index };
      }
      this.render(stash, loadout);
      return;
    }

    if (this.selected.type === 'stash') {
      if (this.selected.index === index) {
        this.selected = null;
      } else {
        const sourceItem = stash[this.selected.index];
        stash[this.selected.index] = clickedItem ?? null;
        stash[index] = sourceItem ?? null;
        this.selected = null;
        SaveData.save();
      }
      this.render(stash, loadout);
      return;
    }

    const loadoutItem = loadout[this.selected.slot];
    loadout[this.selected.slot] = clickedItem ?? null;
    stash[index] = loadoutItem ?? null;
    this.selected = null;
    SaveData.save();
    this.render(stash, loadout);
  }

  private handleLoadoutClick(slotId: LoadoutSlotId, stash: StashSlot[], loadout: LoadoutData): void {
    const clickedItem = loadout[slotId];

    if (!this.selected) {
      if (clickedItem) {
        this.selected = { type: 'loadout', slot: slotId };
      }
      this.render(stash, loadout);
      return;
    }

    if (this.selected.type === 'loadout') {
      if (this.selected.slot === slotId) {
        this.selected = null;
        this.render(stash, loadout);
        return;
      }

      const sourceItem = loadout[this.selected.slot];
      if (sourceItem && isSlotCompatible(slotId, sourceItem)) {
        if (!clickedItem || isSlotCompatible(this.selected.slot, clickedItem)) {
          loadout[this.selected.slot] = clickedItem ?? null;
          loadout[slotId] = sourceItem;
          SaveData.save();
        }
      }
      this.selected = null;
      this.render(stash, loadout);
      return;
    }

    const sourceItem = stash[this.selected.index];
    if (!sourceItem) {
      this.selected = null;
      this.render(stash, loadout);
      return;
    }

    if (!isSlotCompatible(slotId, sourceItem)) {
      this.render(stash, loadout);
      return;
    }

    stash[this.selected.index] = clickedItem ?? null;
    loadout[slotId] = sourceItem;
    this.selected = null;
    SaveData.save();
    this.render(stash, loadout);
  }
}

export const LoadoutUI = new LoadoutUISystem();
