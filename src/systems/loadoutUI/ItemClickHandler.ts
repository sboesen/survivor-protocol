import type { StashSlot, Item } from '../../items/types';
import type { LoadoutData } from '../../types';
import { LOADOUT_SLOT_ORDER, isSlotCompatible, type LoadoutSlotId } from '../../items/loadout';
import { SaveData } from '../saveData';

type Selection =
  | { type: 'stash'; index: number }
  | { type: 'loadout'; slot: LoadoutSlotId };

export class ItemClickHandler {
  private selected: Selection | null = null;
  private pendingClick: { selection: Selection; timer: number } | null = null;

  getSelected(): Selection | null {
    return this.selected;
  }

  setSelected(selection: Selection | null): void {
    this.selected = selection;
  }

  handleSlotClick(selection: Selection, isSalvageMode: boolean, onStashSalvage: (index: number) => void): void {
    if (isSalvageMode) {
      if (selection.type === 'stash') {
        onStashSalvage(selection.index);
      }
      return;
    }

    if (this.pendingClick) {
      const same = this.isSameSelection(this.pendingClick.selection, selection);
      window.clearTimeout(this.pendingClick.timer);

      if (same) {
        this.pendingClick = null;
        return; // Double click handled by caller
      }

      this.handleSingleClick(this.pendingClick.selection);
      this.pendingClick = null;
    }

    const timer = window.setTimeout(() => {
      this.pendingClick = null;
      this.handleSingleClick(selection);
    }, 250);

    this.pendingClick = { selection, timer };
  }

  handleDoubleClick(selection: Selection, stash: StashSlot[], loadout: LoadoutData, onRender: () => void): void {
    if (selection.type === 'stash') {
      this.handleStashDoubleClick(selection.index, stash, loadout);
    } else {
      this.handleLoadoutDoubleClick(selection.slot, stash, loadout);
    }
    this.selected = null;
    SaveData.save();
    onRender();
  }

  private isSameSelection(a: Selection, b: Selection): boolean {
    if (a.type !== b.type) return false;
    return a.type === 'stash' ? a.index === (b as { index: number }).index : a.slot === (b as { slot: LoadoutSlotId }).slot;
  }

  private handleSingleClick(_selection: Selection): void {
    // Inspection removed in favor of tooltips
  }

  private handleStashDoubleClick(index: number, stash: StashSlot[], loadout: LoadoutData): void {
    const item = stash[index];
    if (!item) return;

    const slotId = this.findAutoEquipSlot(item, loadout);
    if (!slotId) return;

    const targetItem = loadout[slotId];
    loadout[slotId] = item;
    stash[index] = targetItem ?? null;
  }

  private handleLoadoutDoubleClick(slotId: LoadoutSlotId, stash: StashSlot[], loadout: LoadoutData): void {
    const loadoutItem = loadout[slotId];

    if (this.selected?.type === 'stash') {
      const sourceItem = stash[this.selected.index];
      if (sourceItem && isSlotCompatible(slotId, sourceItem)) {
        stash[this.selected.index] = loadoutItem ?? null;
        loadout[slotId] = sourceItem;
        return;
      }
    }

    if (!loadoutItem) return;
    const emptyIndex = stash.findIndex(slot => slot === null);
    if (emptyIndex !== -1) {
      stash[emptyIndex] = loadoutItem;
      loadout[slotId] = null;
      return;
    }

    const swapIndex = stash.findIndex(slot => slot && slot.type === loadoutItem.type);
    if (swapIndex === -1) return;
    const swapItem = stash[swapIndex];
    stash[swapIndex] = loadoutItem;
    loadout[slotId] = swapItem ?? null;
  }

  private findAutoEquipSlot(item: Item, loadout: LoadoutData): LoadoutSlotId | null {
    const compatible = LOADOUT_SLOT_ORDER.filter(slot => isSlotCompatible(slot, item));
    if (compatible.length === 0) return null;
    const emptySlot = compatible.find(slot => !loadout[slot]);
    return emptySlot ?? compatible[0];
  }
}
