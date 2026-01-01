import type { Upgrades } from '../types';

export const UPGRADES: Upgrades = {
  pepper_spray: { name: 'Pepper Spray', type: 'Weapon', desc: 'Toxic green cloud spray', dmg: 5, cd: 3 },
  mop_bucket: { name: 'Mop Bucket', type: 'Weapon', desc: 'Damaging soap puddle', dmg: 5, cd: 40, area: 90 },
  frying_pan: { name: 'Frying Pan', type: 'Weapon', desc: 'High arc damage', dmg: 35, cd: 70 },
  thrown_cds: { name: 'Thrown CDs', type: 'Weapon', desc: 'Shoots facing direction', dmg: 9, cd: 25 },
  server_zap: { name: 'Server Zap', type: 'Weapon', desc: 'Lightning bounces to enemies', dmg: 15, cd: 35, bounces: 4 },
  fireball: { name: 'Fireball', type: 'Weapon', desc: 'Homing fireball with trail', dmg: 25, cd: 200 },
  lighter: { name: 'Lighter', type: 'Weapon', desc: 'Short-range flame cone', dmg: 1, cd: 3 },
  pierce: { name: 'Sharp Edges', type: 'Passive', desc: 'Projectiles pierce +1 enemy', pierce: 1 },
  scope: { name: 'Good Aim', type: 'Passive', desc: '+15% Crit Chance (3x Dmg)', crit: 15 },
  damage: { name: 'Energy Drink', type: 'Passive', desc: '+20% Base Damage', damageMult: 0.2 },
  cooldown: { name: 'Caffeine', type: 'Passive', desc: '-10% Weapon Cooldown', cooldownMult: 0.1 }
};
