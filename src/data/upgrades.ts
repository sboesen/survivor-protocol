import type { Upgrades } from '../types';

export const UPGRADES: Upgrades = {
  wand: { name: 'Magic Wand', type: 'Weapon', desc: 'Shoots nearest enemy', dmg: 10, cd: 50 },
  orbit: { name: 'Holy Aura', type: 'Weapon', desc: 'Damaging zone', dmg: 5, cd: 40, area: 90 },
  axe: { name: 'Great Axe', type: 'Weapon', desc: 'High arc damage', dmg: 35, cd: 70 },
  knife: { name: 'Throwing Knife', type: 'Weapon', desc: 'Shoots facing direction', dmg: 9, cd: 25 },
  pierce: { name: 'Hollow Point', type: 'Passive', desc: 'Projectiles pierce +1 enemy', pierce: 1 },
  scope: { name: 'Sniper Scope', type: 'Passive', desc: '+15% Crit Chance (3x Dmg)', crit: 15 },
  damage: { name: 'Titan Belt', type: 'Passive', desc: '+20% Base Damage', damageMult: 0.2 },
  cooldown: { name: 'Empty Tome', type: 'Passive', desc: '-10% Weapon Cooldown', cooldownMult: 0.1 }
};
