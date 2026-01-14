import type { StashSlot, Item } from '../../items/types';
import type { LoadoutData } from '../../types';
import { isSlotCompatible, isRelicClassCompatible, type LoadoutSlotId } from '../../items/loadout';
import { SaveData } from '../saveData';

export class DragDropHandler {
  handleDragStart(event: DragEvent, sourceType: 'stash' | 'loadout', sourceId: number | LoadoutSlotId): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', JSON.stringify({
      sourceType,
      sourceId,
    }));
    event.dataTransfer.effectAllowed = 'move';
  }

  handleDragOver(event: DragEvent, cell: HTMLElement): void {
    event.preventDefault();
    cell.classList.add('drag-over');
  }

  handleDragLeave(_event: DragEvent, cell: HTMLElement): void {
    cell.classList.remove('drag-over');
  }

  handleDrop(
    event: DragEvent,
    targetType: 'stash' | 'loadout',
    targetId: number | LoadoutSlotId,
    stash: StashSlot[],
    loadout: LoadoutData,
    cell: HTMLElement
  ): void {
    event.preventDefault();
    cell.classList.remove('drag-over');
    if (!event.dataTransfer) return;
    const raw = event.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as {
        sourceType: 'stash' | 'loadout';
        sourceId: number | LoadoutSlotId;
      };
      this.moveItem(payload.sourceType, payload.sourceId, targetType, targetId, stash, loadout);
    } catch {
      return;
    }
  }

  private getItemAt(
    type: 'stash' | 'loadout',
    id: number | LoadoutSlotId,
    stash: StashSlot[],
    loadout: LoadoutData
  ): Item | null {
    if (type === 'stash') return stash[id as number] ?? null;
    return loadout[id as LoadoutSlotId] ?? null;
  }

  private setItemAt(
    type: 'stash' | 'loadout',
    id: number | LoadoutSlotId,
    item: Item | null,
    stash: StashSlot[],
    loadout: LoadoutData
  ): void {
    if (type === 'stash') {
      stash[id as number] = item;
    } else {
      loadout[id as LoadoutSlotId] = item;
    }
  }

  private moveItem(
    sourceType: 'stash' | 'loadout',
    sourceId: number | LoadoutSlotId,
    targetType: 'stash' | 'loadout',
    targetId: number | LoadoutSlotId,
    stash: StashSlot[],
    loadout: LoadoutData
  ): void {
    const sourceItem = this.getItemAt(sourceType, sourceId, stash, loadout);
    if (!sourceItem) return;
    const targetItem = this.getItemAt(targetType, targetId, stash, loadout);

    if (targetType === 'loadout' && !isSlotCompatible(targetId as LoadoutSlotId, sourceItem)) {
      return;
    }

    if (targetType === 'loadout' && !isRelicClassCompatible(sourceItem, SaveData.data.selectedChar)) {
      return;
    }

    if (sourceType === 'loadout' && targetType === 'loadout' && targetItem) {
      if (!isSlotCompatible(sourceId as LoadoutSlotId, targetItem)) return;
      if (!isRelicClassCompatible(targetItem, SaveData.data.selectedChar)) return;
    }

    this.setItemAt(sourceType, sourceId, targetItem, stash, loadout);
    this.setItemAt(targetType, targetId, sourceItem, stash, loadout);
    SaveData.save();
  }
}
