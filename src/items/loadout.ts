import type { LoadoutData } from '../types';
import type { Item, ItemType } from './types';

export type LoadoutSlotId = keyof LoadoutData;

export const LOADOUT_SLOT_ORDER: LoadoutSlotId[] = [
  'relic',
  'offhand',
  'weapon',
  'helm',
  'armor',
  'accessory1',
  'accessory2',
  'accessory3',
];

export const LOADOUT_SLOT_LABELS: Record<LoadoutSlotId, string> = {
  relic: 'Relic',
  offhand: 'Offhand',
  weapon: 'Weapon',
  helm: 'Helm',
  armor: 'Armor',
  accessory1: 'Gloves',
  accessory2: 'Accessory',
  accessory3: 'Boots',
};

export const LOADOUT_SLOT_TYPES: Record<LoadoutSlotId, ItemType | 'relic'> = {
  relic: 'relic',
  offhand: 'offhand',
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
    offhand: null,
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
  if (allowed === 'relic') return item.type === 'relic';
  return item.type === allowed;
}

export function isRelicClassCompatible(item: Item | null, classId: string): boolean {
  if (!item || item.type !== 'relic') return true;
  if (!item.relicClassId) return false;
  return item.relicClassId === classId;
}

export function findFirstCompatibleSlot(loadout: LoadoutData, item: Item): LoadoutSlotId | null {
  for (const slot of LOADOUT_SLOT_ORDER) {
    if (!loadout[slot] && isSlotCompatible(slot, item)) return slot;
  }
  return null;
}
