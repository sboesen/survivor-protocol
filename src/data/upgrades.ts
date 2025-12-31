import type { Upgrades } from '../types';

export const UPGRADES: Upgrades = {
  wand: { name: 'Pepper Spray', type: 'Weapon', desc: 'Sprays nearest zombie', dmg: 10, cd: 50 },
  orbit: { name: 'Mop Bucket', type: 'Weapon', desc: 'Damaging soap puddle', dmg: 5, cd: 40, area: 90 },
  axe: { name: 'Frying Pan', type: 'Weapon', desc: 'High arc damage', dmg: 35, cd: 70 },
  knife: { name: 'Thrown CDs', type: 'Weapon', desc: 'Shoots facing direction', dmg: 9, cd: 25 },
  pierce: { name: 'Sharp Edges', type: 'Passive', desc: 'Projectiles pierce +1 enemy', pierce: 1 },
  scope: { name: 'Good Aim', type: 'Passive', desc: '+15% Crit Chance (3x Dmg)', crit: 15 },
  damage: { name: 'Energy Drink', type: 'Passive', desc: '+20% Base Damage', damageMult: 0.2 },
  cooldown: { name: 'Caffeine', type: 'Passive', desc: '-10% Weapon Cooldown', cooldownMult: 0.1 }
};
