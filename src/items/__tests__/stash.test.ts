import { describe, it, expect } from 'vitest';
import { Stash } from '../stash';
import type { Item } from '../types';

const makeItem = (id: string): Item => ({
  id,
  name: `Item ${id}`,
  type: 'weapon',
  rarity: 'common',
  affixes: [],
});

describe('Stash', () => {
  it('should initialize with default capacity', () => {
    const stash = new Stash();
    expect(stash.slots.length).toBe(200);
  });

  it('should add items to the first empty slot', () => {
    const stash = new Stash(3);
    const index = stash.addItem(makeItem('a'));
    expect(index).toBe(0);
    expect(stash.slots[0]?.id).toBe('a');
  });

  it('should return null when full', () => {
    const stash = new Stash(1);
    stash.addItem(makeItem('a'));
    const index = stash.addItem(makeItem('b'));
    expect(index).toBeNull();
  });

  it('should remove items and clear the slot', () => {
    const stash = new Stash(2);
    stash.addItem(makeItem('a'));
    const removed = stash.removeItem(0);
    expect(removed?.id).toBe('a');
    expect(stash.slots[0]).toBeNull();
  });

  it('should swap items between slots', () => {
    const stash = new Stash(2);
    stash.addItem(makeItem('a'));
    stash.addItem(makeItem('b'));
    stash.swap(0, 1);
    expect(stash.slots[0]?.id).toBe('b');
    expect(stash.slots[1]?.id).toBe('a');
  });

  it('should pad slots when loading from JSON', () => {
    const stash = Stash.fromJSON([makeItem('a')], 3);
    expect(stash.slots.length).toBe(3);
    expect(stash.slots[0]?.id).toBe('a');
    expect(stash.slots[1]).toBeNull();
  });
});
