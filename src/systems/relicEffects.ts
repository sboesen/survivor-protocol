import type { Item } from '../items/types';
import type { Weapon } from '../types';
import { getRelicDefinitionById } from '../data/relics';

export interface RelicWeaponModifiers {
  projectileBonus: number;
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
