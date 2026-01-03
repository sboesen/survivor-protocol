/**
 * Weapon firing system.
 *
 * Extracted from game.ts for better testability.
 */

import { calculateWrappedAngle, findNearestEnemy } from './targeting';
import type { Enemy } from '../entities/enemy';
import type { Weapon } from '../types';

/**
 * Result of a weapon fire action.
 * Contains data about what should be spawned/created.
 */
export interface ProjectileData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  dmg: number;
  duration: number;
  pierce: number;
  isCrit: boolean;
  isBubble?: boolean;
  isArc?: boolean;
  splits?: boolean;
  explodeRadius?: number;
  knockback?: number;
}

export interface FireballData {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  dmg: number;
  duration: number;
  pierce: number;
  isCrit: boolean;
  explodeRadius?: number;
  trailDamage?: number;
}

export interface SprayData {
  baseAngle: number;
  isLighter: boolean;
  gasColor: string;
  pelletCount: number;
  spreadAmount: number;
  coneLength: number;
}

export interface WeaponFireResult {
  fired: boolean;
  projectiles?: ProjectileData[];
  fireballs?: FireballData[];
  spray?: SprayData;
  auraDamage?: { dmg: number; isCrit: boolean; area: number };
}

/**
 * Fire a weapon of type 'nearest'.
 */
export function fireNearest(
  p: { x: number; y: number },
  enemies: Enemy[],
  dmg: number,
  isCrit: boolean,
  pierce: number
): WeaponFireResult {
  const { enemy: near } = findNearestEnemy(enemies, p.x, p.y, 400);

  if (!near) {
    return { fired: false };
  }

  const ang = calculateWrappedAngle(p.x, p.y, near.x, near.y);

  return {
    fired: true,
    projectiles: [{
      x: p.x,
      y: p.y,
      vx: Math.cos(ang) * 8,
      vy: Math.sin(ang) * 8,
      radius: 5,
      color: '#0ff',
      dmg,
      duration: 60,
      pierce,
      isCrit,
    }],
  };
}

/**
 * Fire a weapon of type 'bubble'.
 */
export function fireBubble(
  p: { x: number; y: number },
  enemies: Enemy[],
  w: Weapon,
  dmg: number,
  isCrit: boolean,
  pierce: number,
  projectileBonus: number = 0
): WeaponFireResult {
  const { enemy: near } = findNearestEnemy(enemies, p.x, p.y, 400);

  if (!near) {
    return { fired: false };
  }

  const ang = calculateWrappedAngle(p.x, p.y, near.x, near.y);
  const speed = 3.5 * (w.speedMult || 1);
  const count = (w.projectileCount || 1) + projectileBonus;

  const projectiles: ProjectileData[] = [];

  for (let i = 0; i < count; i++) {
    const spread = (i - (count - 1) / 2) * 0.15;
    projectiles.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(ang + spread) * speed,
      vy: Math.sin(ang + spread) * speed,
      radius: 5,
      color: '#aaddff',
      dmg,
      duration: 70,
      pierce,
      isCrit,
      isBubble: true,
      splits: w.splits,
    });
  }

  return { fired: true, projectiles };
}

/**
 * Fire a weapon of type 'facing'.
 */
export function fireFacing(
  p: { x: number; y: number },
  lastDx: number | undefined,
  lastDy: number | undefined,
  aimAngle: number | undefined,
  w: Weapon,
  dmg: number,
  isCrit: boolean,
  pierce: number,
  projectileBonus: number = 0
): WeaponFireResult {
  const angle = aimAngle ?? Math.atan2(lastDy || 0, lastDx || 1);
  const speed = 10 * (w.speedMult || 1);
  const count = (w.projectileCount || 1) + projectileBonus;

  const projectiles: ProjectileData[] = [];

  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 0.2;
    projectiles.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(angle + spread) * speed,
      vy: Math.sin(angle + spread) * speed,
      radius: 4,
      color: '#f00',
      dmg,
      duration: 40,
      pierce: pierce + 1,
      isCrit,
    });
  }

  return { fired: true, projectiles };
}

/**
 * Fire a weapon of type 'arc'.
 */
export function fireArc(
  p: { x: number; y: number },
  w: Weapon,
  dmg: number,
  isCrit: boolean,
  pierce: number,
  projectileBonus: number = 0
): WeaponFireResult {
  const count = (w.projectileCount || 1) + projectileBonus;
  const size = w.size || 10;

  const projectiles: ProjectileData[] = [];

  for (let i = 0; i < count; i++) {
    const vx = (Math.random() - 0.5) * 4;
    projectiles.push({
      x: p.x,
      y: p.y,
      vx,
      vy: -10,
      radius: size,
      color: '#aaa',
      dmg: dmg * 2,
      duration: 60,
      pierce: pierce + 2,
      isCrit,
      isArc: true,
      explodeRadius: w.explodeRadius,
      knockback: w.knockback,
    });
  }

  return { fired: true, projectiles };
}

/**
 * Fire a weapon of type 'fireball'.
 */
export function fireFireball(
  p: { x: number; y: number },
  enemies: Enemy[],
  w: Weapon,
  dmg: number,
  isCrit: boolean,
  pierce: number,
  projectileBonus: number = 0
): WeaponFireResult {
  const { enemy: near } = findNearestEnemy(enemies, p.x, p.y, 400);

  if (!near) {
    return { fired: false };
  }

  const speed = 6 * (w.speedMult || 1);
  const duration = 90 * (w.speedMult || 1);
  const count = (w.projectileCount || 1) + projectileBonus;

  const baseAngle = calculateWrappedAngle(p.x, p.y, near.x, near.y);
  const fireballs: FireballData[] = [];

  for (let i = 0; i < count; i++) {
    let spreadAngle = 0;
    if (count > 1) {
      const spread = 0.08;
      if (count % 2 === 0) {
        const half = count / 2;
        if (i < half - 1) {
          spreadAngle = -(half - 1 - i) * spread;
        } else if (i >= half) {
          spreadAngle = (i - half + 1) * spread;
        }
      } else {
        spreadAngle = (i - (count - 1) / 2) * spread;
      }
    }

    const targetAngle = baseAngle + spreadAngle;
    const targetX = p.x + Math.cos(targetAngle) * 400;
    const targetY = p.y + Math.sin(targetAngle) * 400;

    const perpAngle = baseAngle + Math.PI / 2;
    const startOffset = 15 * Math.sin(spreadAngle);
    const startX = p.x + Math.cos(perpAngle) * startOffset;
    const startY = p.y + Math.sin(perpAngle) * startOffset;

    fireballs.push({
      startX,
      startY,
      targetX,
      targetY,
      speed,
      dmg,
      duration,
      pierce,
      isCrit,
      explodeRadius: w.explodeRadius,
      trailDamage: w.trailDamage,
    });
  }

  return { fired: true, fireballs };
}

/**
 * Fire a weapon of type 'spray' (pepper_spray or lighter).
 */
export function fireSpray(
  _p: { x: number; y: number },
  lastDx: number | undefined,
  lastDy: number | undefined,
  aimAngle: number | undefined,
  w: Weapon,
  weaponId: string
): WeaponFireResult {
  const baseAngle = aimAngle ?? (
    lastDx !== undefined ?
      Math.atan2(lastDy || 0, lastDx) :
      Math.random() * Math.PI * 2
  );

  const isLighter = weaponId === 'lighter';
  const gasColor = isLighter ? '#ffcccc' : '#33ff33';
  const pelletCount = isLighter ? 3 : (w.pelletCount || 5);
  const spreadAmount = w.spread || (isLighter ? 0.25 : 0.4);
  const coneLength = w.coneLength || 60;

  return {
    fired: true,
    spray: {
      baseAngle,
      isLighter,
      gasColor,
      pelletCount,
      spreadAmount,
      coneLength,
    },
  };
}

/**
 * Check if aura should trigger and return damage data.
 */
export function checkAura(
  w: Weapon,
  frameCount: number,
  dmg: number,
  isCrit: boolean
): WeaponFireResult {
  if (!w.area) {
    return { fired: false };
  }

  // Aura triggers every 20 frames
  if (frameCount % 20 !== 0) {
    return { fired: false };
  }

  return {
    fired: true,
    auraDamage: { dmg, isCrit, area: w.area },
  };
}

/**
 * Result of weapon damage calculation.
 */
export interface DamageResult {
  damage: number;
  isCrit: boolean;
}

/**
 * Calculate weapon damage with critical hit.
 *
 * @param baseDmg - Base weapon damage
 * @param dmgMult - Player damage multiplier
 * @param critChance - Player critical hit chance (0-1)
 * @param randomValue - Random value [0,1) for crit check (allows testing)
 * @returns Damage result with final damage and crit status
 */
export function calculateWeaponDamage(
  baseDmg: number,
  dmgMult: number,
  critChance: number,
  randomValue: number = Math.random()
): DamageResult {
  const isCrit = randomValue < critChance;
  const damage = baseDmg * dmgMult * (isCrit ? 3 : 1);
  return { damage, isCrit };
}

/**
 * Calculate how much to decrement weapon cooldown.
 *
 * @param currentCd - Current cooldown value
 * @param cooldownBonus - Player cooldown reduction bonus (e.g., from items)
 * @param isOllieUltActive - Whether Ollie's ultimate is active (doubles cooldown speed)
 * @returns New cooldown value (clamped to 0)
 */
export function decrementCooldown(
  currentCd: number,
  cooldownBonus: number,
  isOllieUltActive: boolean = false
): number {
  const decrement = (1 + cooldownBonus) * (isOllieUltActive ? 2 : 1);
  return Math.max(0, currentCd - decrement);
}

/**
 * Main weapon firing function.
 * Returns data about what should be spawned without side effects.
 */
export function fireWeapon(
  weaponType: Weapon['type'],
  weaponId: string,
  p: { x: number; y: number },
  enemies: Enemy[],
  w: Weapon,
  dmg: number,
  isCrit: boolean,
  pierce: number,
  lastDx: number | undefined,
  lastDy: number | undefined,
  aimAngle: number | undefined,
  frameCount: number,
  projectileBonus: number = 0
): WeaponFireResult {
  switch (weaponType) {
    case 'nearest':
      return fireNearest(p, enemies, dmg, isCrit, pierce);
    case 'bubble':
      return fireBubble(p, enemies, w, dmg, isCrit, pierce, projectileBonus);
    case 'facing':
      return fireFacing(p, lastDx, lastDy, aimAngle, w, dmg, isCrit, pierce, projectileBonus);
    case 'arc':
      return fireArc(p, w, dmg, isCrit, pierce, projectileBonus);
    case 'fireball':
      return fireFireball(p, enemies, w, dmg, isCrit, pierce, projectileBonus);
    case 'spray':
      return fireSpray(p, lastDx, lastDy, aimAngle, w, weaponId);
    case 'aura':
      return checkAura(w, frameCount, dmg, isCrit);
    default:
      return { fired: false };
  }
}
