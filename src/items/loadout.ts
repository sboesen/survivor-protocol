import type { LoadoutData } from '../types';
import type { Item, ItemType } from './types';

export type LoadoutSlotId = keyof LoadoutData;

export const LOADOUT_SLOT_ORDER: LoadoutSlotId[] = [
  'relic',
  'weapon',
  'helm',
  'armor',
  'accessory1',
  'accessory2',
  'accessory3',
];

export const LOADOUT_SLOT_LABELS: Record<LoadoutSlotId, string> = {
  relic: 'Relic',
  weapon: 'Weapon',
  helm: 'Helm',
  armor: 'Armor',
  accessory1: 'Accessory',
  accessory2: 'Accessory',
  accessory3: 'Accessory',
};

export const LOADOUT_SLOT_TYPES: Record<LoadoutSlotId, ItemType | 'relic'> = {
  relic: 'relic',
  weapon: 'weapon',
  helm: 'helm',
  armor: 'armor',
  accessory1: 'accessory',
  accessory2: 'accessory',
  accessory3: 'accessory',
};

export function createEmptyLoadout(): LoadoutData {
  return {
    relic: null,
    weapon: null,
    helm: null,
    armor: null,
    accessory1: null,
    accessory2: null,
    accessory3: null,
  };
}

export function isSlotCompatible(slot: LoadoutSlotId, item: Item | null): boolean {
  if (!item) return false;
  const allowed = LOADOUT_SLOT_TYPES[slot];
  if (allowed === 'relic') return false;
  return item.type === allowed;
}

export function findFirstCompatibleSlot(loadout: LoadoutData, item: Item): LoadoutSlotId | null {
  for (const slot of LOADOUT_SLOT_ORDER) {
    if (!loadout[slot] && isSlotCompatible(slot, item)) return slot;
  }
  return null;
}
