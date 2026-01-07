import type { Upgrades } from '../types';

export const UPGRADES: Upgrades = {
  bubble_stream: { name: 'Bubble Stream', type: 'Weapon', desc: 'Wavy bubbles that float up', dmg: 12, cd: 60 },
  frying_pan: { name: 'Frying Pan', type: 'Weapon', desc: 'High arc damage', dmg: 35, cd: 70 },
  thrown_cds: { name: 'Thrown CDs', type: 'Weapon', desc: 'Shoots facing direction', dmg: 9, cd: 25 },
  fireball: { name: 'Fireball', type: 'Weapon', desc: 'Homing fireball with trail', dmg: 25, cd: 133 },
  lighter: { name: 'Lighter', type: 'Weapon', desc: 'Short-range flame cone', dmg: 1, cd: 3 },
  shield_bash: { name: 'Shield Bash', type: 'Weapon', desc: 'Heavy close-range bash', dmg: 25, cd: 25 },
  bow: { name: 'Bow', type: 'Weapon', desc: 'Rapid arrow shots at nearest enemy', dmg: 8, cd: 30 },
  pierce: { name: 'Sharp Edges', type: 'Item', desc: 'Projectiles pierce +1 enemy', pierce: 1 },
  scope: { name: 'Good Aim', type: 'Item', desc: '+15% Crit Chance (3x Dmg)', crit: 15 },
  damage: { name: 'Energy Drink', type: 'Item', desc: '+20% Base Damage', damageMult: 0.2 },
  cooldown: { name: 'Caffeine', type: 'Item', desc: '-10% Weapon Cooldown', cooldownMult: 0.1 },
  projectile: { name: 'Extra Ammo', type: 'Item', desc: '+1 Projectile for all weapons', projectileCount: 1 }
};
