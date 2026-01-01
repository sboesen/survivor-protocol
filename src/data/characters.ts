import type { Character } from '../types';

export const CHARACTERS: Record<string, Character> = {
  janitor: {
    id: 'janitor',
    name: 'Janitor',
    icon: '🧹',
    weapon: 'orbit',
    hpMod: 1.2,
    spdMod: 0.9,
    ult: 'ClosingTime',
    desc: 'Tanky. Start: Mop Bucket.'
  },
  skater: {
    id: 'skater',
    name: 'Skater',
    icon: '🛹',
    weapon: 'knife',
    hpMod: 0.8,
    spdMod: 1.3,
    ult: 'Ollie',
    desc: 'Fast. Start: Thrown CDs.'
  },
  mallCop: {
    id: 'mallCop',
    name: 'Mall Cop',
    icon: '👮',
    weapon: 'wand',
    hpMod: 1.5,
    spdMod: 0.8,
    ult: 'Security',
    desc: 'High HP. Start: Pepper Spray.'
  },
  foodCourt: {
    id: 'foodCourt',
    name: 'Chef',
    icon: '🍔',
    weapon: 'axe',
    hpMod: 1.0,
    spdMod: 1.0,
    ult: 'GreaseFire',
    desc: 'Balanced. Start: Frying Pan.'
  },
  teenager: {
    id: 'teenager',
    name: 'Teenager',
    icon: '🎸',
    weapon: 'claw',
    hpMod: 0.9,
    spdMod: 1.1,
    ult: 'GuitarSolo',
    desc: 'Edgy. Start: Rake Claw.'
  },
  techSupport: {
    id: 'techSupport',
    name: 'Tech Support',
    icon: '💻',
    weapon: 'chain',
    hpMod: 0.7,
    spdMod: 1.0,
    ult: 'Reboot',
    desc: 'Fragile. Start: Server Zap.'
  },
  ninja: {
    id: 'ninja',
    name: 'Ninja',
    icon: '🥷',
    weapon: 'flicker',
    hpMod: 0.85,
    spdMod: 1.2,
    ult: 'ShadowClone',
    desc: 'Elusive. Start: Flicker Strike.'
  }
};
