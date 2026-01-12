import type { Item } from '../items/types';
import type { Weapon } from '../types';
import { getRelicDefinitionById } from '../data/relics';

export interface RelicWeaponModifiers {
  projectileBonus: number;
  projectileOverride?: number;
  damageMult: number;
  cooldownMult: number;
}

export function getActiveRelic(relic: Item | null, classId: string): Item | null {
  if (!relic || relic.type !== 'relic') return null;
  if (!relic.relicClassId || relic.relicClassId !== classId) return null;
  return relic;
}

export function getRelicWeaponModifiers(relic: Item | null, weaponId: Weapon['id']): RelicWeaponModifiers {
  const empty: RelicWeaponModifiers = { projectileBonus: 0, damageMult: 1, cooldownMult: 1 };
  if (!relic?.relicId) return empty;

  const definition = getRelicDefinitionById(relic.relicId);
  const effect = definition?.effect;
  if (!effect || effect.weaponId !== weaponId) return empty;

  return {
    projectileBonus: effect.projectileBonus ?? 0,
    projectileOverride: effect.projectileOverride,
    damageMult: effect.damageMult ?? 1,
    cooldownMult: effect.cooldownMult ?? 1,
  };
}

export function getRelicCooldownRefund(relic: Item | null, weaponId: Weapon['id']): number {
  if (!relic?.relicId) return 0;

  const definition = getRelicDefinitionById(relic.relicId);
  const effect = definition?.effect;
  if (!effect || effect.weaponId !== weaponId) return 0;

  return effect.cooldownRefund ?? 0;
}

export interface RelicFireballMergeEffect {
  projectileOverride?: number;
  mergeDamageMult: number;
  mergeExplosionRadius: number;
  mergeRadius: number;
  baseExplosionRadius: number;
  explosionDamageMult: number;
}

export function getRelicFireballMergeEffect(
  relic: Item | null,
  weaponId: Weapon['id']
): RelicFireballMergeEffect | null {
  if (!relic?.relicId) return null;

  const definition = getRelicDefinitionById(relic.relicId);
  const effect = definition?.effect;
  if (!effect || effect.weaponId !== weaponId) return null;

  const mergeDamageMult = effect.fireballMergeDamageMult ?? 0;
  const mergeExplosionRadius = effect.fireballMergeExplosionRadius ?? 0;
  const mergeRadius = effect.fireballMergeRadius ?? 0;
  const baseExplosionRadius = effect.fireballExplosionBaseRadius ?? 0;
  const explosionDamageMult = effect.fireballExplosionDamageMult ?? 0;
  const projectileOverride = effect.projectileOverride;

  if (
    projectileOverride === undefined &&
    mergeDamageMult === 0 &&
    mergeExplosionRadius === 0 &&
    mergeRadius === 0 &&
    baseExplosionRadius === 0 &&
    explosionDamageMult === 0
  ) {
    return null;
  }

  return {
    projectileOverride,
    mergeDamageMult,
    mergeExplosionRadius,
    mergeRadius,
    baseExplosionRadius,
    explosionDamageMult,
  };
}
