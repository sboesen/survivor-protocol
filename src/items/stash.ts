import type { Item, StashSlot } from './types';

export class Stash {
  slots: StashSlot[];
  capacity: number;

  constructor(capacity = 200, slots: StashSlot[] | null = null) {
    this.capacity = capacity;
    this.slots = slots ? [...slots] : Array.from({ length: capacity }, () => null);
    if (this.slots.length !== capacity) {
      this.slots.length = capacity;
      for (let i = 0; i < capacity; i++) {
        if (typeof this.slots[i] === 'undefined') this.slots[i] = null;
      }
    }
  }

  addItem(item: Item): number | null {
    const index = this.slots.findIndex(slot => slot === null);
    if (index === -1) return null;
    this.slots[index] = item;
    return index;
  }

  removeItem(index: number): Item | null {
    if (index < 0 || index >= this.capacity) return null;
    const item = this.slots[index];
    this.slots[index] = null;
    return item;
  }

  swap(from: number, to: number): void {
    if (from < 0 || to < 0 || from >= this.capacity || to >= this.capacity) return;
    const temp = this.slots[from];
    this.slots[from] = this.slots[to];
    this.slots[to] = temp;
  }

  toJSON(): StashSlot[] {
    return [...this.slots];
  }

  static fromJSON(data: StashSlot[] | undefined | null, capacity = 200): Stash {
    return new Stash(capacity, data ?? null);
  }
}
