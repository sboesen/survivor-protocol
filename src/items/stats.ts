import type { LoadoutData } from '../types';
import type { ItemAffix } from './types';

export interface StatBlock {
  flatDamage: number;
  percentDamage: number;
  areaFlat: number;
  areaPercent: number;
  cooldownReduction: number;
  projectiles: number;
  pierce: number;
  duration: number;
  speed: number;
  maxHp: number;
  armor: number;
  hpRegen: number;
  percentHealing: number;
  magnet: number;
  luck: number;
  percentGold: number;
  pickupRadius: number;
  percentXp: number;
  allStats: number;
}

const EMPTY_STATS: StatBlock = {
  flatDamage: 0,
  percentDamage: 0,
  areaFlat: 0,
  areaPercent: 0,
  cooldownReduction: 0,
  projectiles: 0,
  pierce: 0,
  duration: 0,
  speed: 0,
  maxHp: 0,
  armor: 0,
  hpRegen: 0,
  percentHealing: 0,
  magnet: 0,
  luck: 0,
  percentGold: 0,
  pickupRadius: 0,
  percentXp: 0,
  allStats: 0,
};

export function createEmptyStats(): StatBlock {
  return { ...EMPTY_STATS };
}

function applyAffix(stats: StatBlock, affix: ItemAffix): void {
  switch (affix.type) {
    case 'flatDamage':
      stats.flatDamage += affix.value;
      break;
    case 'percentDamage':
      stats.percentDamage += affix.value / 100;
      break;
    case 'areaFlat':
      stats.areaFlat += affix.value;
      break;
    case 'areaPercent':
      stats.areaPercent += affix.value / 100;
      break;
    case 'cooldownReduction':
      stats.cooldownReduction += affix.value / 100;
      break;
    case 'projectiles':
      stats.projectiles += affix.value;
      break;
    case 'pierce':
      stats.pierce += affix.value;
      break;
    case 'duration':
      stats.duration += affix.value;
      break;
    case 'speed':
      stats.speed += affix.value;
      break;
    case 'maxHp':
      stats.maxHp += affix.value;
      break;
    case 'armor':
      stats.armor += affix.value;
      break;
    case 'hpRegen':
      stats.hpRegen += affix.value;
      break;
    case 'percentHealing':
      stats.percentHealing += affix.value / 100;
      break;
    case 'magnet':
      stats.magnet += affix.value;
      break;
    case 'luck':
      stats.luck += affix.value;
      break;
    case 'percentGold':
      stats.percentGold += affix.value / 100;
      break;
    case 'pickupRadius':
      stats.pickupRadius += affix.value;
      break;
    case 'percentXp':
      stats.percentXp += affix.value / 100;
      break;
    case 'allStats':
      stats.allStats += affix.value / 100;
      break;
  }
}

export class ItemStats {
  static empty(): StatBlock {
    return createEmptyStats();
  }

  static calculate(loadout: LoadoutData): StatBlock {
    const stats = createEmptyStats();

    for (const item of Object.values(loadout)) {
      if (!item) continue;
      for (const affix of item.affixes) {
        applyAffix(stats, affix);
      }
    }

    return stats;
  }
}
