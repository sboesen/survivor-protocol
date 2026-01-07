import type { Character } from '../types';

export const CHARACTERS: Record<string, Character> = {
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    icon: '🧙',
    weapon: 'fireball',
    hpMod: 0.75,
    spdMod: 0.95,
    ult: 'MeteorSwarm',
    desc: 'Arcane power. Start: Fireball.'
  },
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    icon: '🛡️',
    weapon: 'bubble_stream',
    hpMod: 1.2,
    spdMod: 0.9,
    ult: 'DivineShield',
    desc: 'Tanky. Start: Holy Aura.'
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    icon: '🗡️',
    weapon: 'thrown_cds',
    hpMod: 0.8,
    spdMod: 1.3,
    ult: 'ShadowStep',
    desc: 'Fast. Start: Dagger Throw.'
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    icon: '⚔️',
    weapon: 'shield_bash',
    hpMod: 1.5,
    spdMod: 0.8,
    ult: 'IronWill',
    desc: 'High HP. Start: Shield Bash.'
  },
  berserker: {
    id: 'berserker',
    name: 'Berserker',
    icon: '🪓',
    weapon: 'frying_pan',
    hpMod: 1.0,
    spdMod: 1.0,
    ult: 'Inferno',
    desc: 'Balanced. Start: War Hammer.'
  },
  pyromancer: {
    id: 'pyromancer',
    name: 'Pyromancer',
    icon: '🔥',
    weapon: 'lighter',
    hpMod: 0.9,
    spdMod: 1.1,
    ult: 'SmokeScreen',
    desc: 'Reckless. Start: Flame Burst.'
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    icon: '🏹',
    weapon: 'bow',
    hpMod: 0.9,
    spdMod: 1.15,
    ult: 'Volley',
    desc: 'Agile ranged. Start: Bow.'
  }
};
