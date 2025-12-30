import type { Upgrades } from '../types';

export const UPGRADES: Upgrades = {
  wand: { name: 'Magic Wand', type: 'Weapon', desc: 'Shoots nearest enemy' },
  orbit: { name: 'Holy Aura', type: 'Weapon', desc: 'Damaging zone' },
  axe: { name: 'Great Axe', type: 'Weapon', desc: 'High arc damage' },
  knife: { name: 'Throwing Knife', type: 'Weapon', desc: 'Shoots facing direction' },
  pierce: { name: 'Hollow Point', type: 'Passive', desc: 'Projectiles pierce +1 enemy' },
  scope: { name: 'Sniper Scope', type: 'Passive', desc: '+15% Crit Chance (3x Dmg)' },
  damage: { name: 'Titan Belt', type: 'Passive', desc: '+20% Base Damage' },
  cooldown: { name: 'Empty Tome', type: 'Passive', desc: '-10% Weapon Cooldown' }
};
