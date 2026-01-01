import type { Character } from '../types';

export const CHARACTERS: Record<string, Character> = {
  dungeonMaster: {
    id: 'dungeonMaster',
    name: 'Dungeon Master',
    icon: '🐉',
    weapon: 'fireball',
    hpMod: 0.75,
    spdMod: 0.95,
    ult: 'MeteorSwarm',
    desc: 'Arcane power. Start: Fireball.'
  },
  janitor: {
    id: 'janitor',
    name: 'Janitor',
    icon: '🧹',
    weapon: 'bubble_stream',
    hpMod: 1.2,
    spdMod: 0.9,
    ult: 'ClosingTime',
    desc: 'Tanky. Start: Bubble Stream.'
  },
  skater: {
    id: 'skater',
    name: 'Skater',
    icon: '🛹',
    weapon: 'thrown_cds',
    hpMod: 0.8,
    spdMod: 1.3,
    ult: 'Ollie',
    desc: 'Fast. Start: Thrown CDs.'
  },
  mallCop: {
    id: 'mallCop',
    name: 'Mall Cop',
    icon: '👮',
    weapon: 'pepper_spray',
    hpMod: 1.5,
    spdMod: 0.8,
    ult: 'Security',
    desc: 'High HP. Start: Pepper Spray.'
  },
  foodCourt: {
    id: 'foodCourt',
    name: 'Chef',
    icon: '🍔',
    weapon: 'frying_pan',
    hpMod: 1.0,
    spdMod: 1.0,
    ult: 'GreaseFire',
    desc: 'Balanced. Start: Frying Pan.'
  },
  teenager: {
    id: 'teenager',
    name: 'Teenager',
    icon: '🧢',
    weapon: 'lighter',
    hpMod: 0.9,
    spdMod: 1.1,
    ult: 'VapeCloud',
    desc: 'Reckless. Start: Lighter.'
  }
};
