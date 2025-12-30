import type { Character } from '../types';

export const CHARACTERS: Record<string, Character> = {
  knight: {
    id: 'knight',
    name: 'Vanguard',
    icon: '🛡️',
    weapon: 'wand',
    hpMod: 1.2,
    spdMod: 0.9,
    ult: 'Shield',
    desc: 'Tanky. Start: Wand.'
  },
  rogue: {
    id: 'rogue',
    name: 'Spectre',
    icon: '🗡️',
    weapon: 'knife',
    hpMod: 0.8,
    spdMod: 1.2,
    ult: 'Haste',
    desc: 'Fast. Start: Knife.'
  },
  mage: {
    id: 'mage',
    name: 'Arcanist',
    icon: '🔮',
    weapon: 'orbit',
    hpMod: 0.9,
    spdMod: 1.0,
    ult: 'Freeze',
    desc: 'AoE. Start: Aura.'
  },
  viking: {
    id: 'viking',
    name: 'Berserk',
    icon: '🪓',
    weapon: 'axe',
    hpMod: 1.5,
    spdMod: 0.8,
    ult: 'Rage',
    desc: 'High HP. Start: Axe.'
  }
};
