import type { Item } from '../../items/types';
import { AFFIX_TIER_BRACKETS } from '../../items/affixTables';
import type { ItemAffix } from '../../items/types';

type WeaponIconKey =
  | 'dagger'
  | 'sword'
  | 'club'
  | 'great_axe'
  | 'spear'
  | 'hammer'
  | 'bow'
  | 'arrow'
  | 'wand'
  | 'torch';

export class SlotHelpers {
  private emptySlotIcons: Record<string, string> = {
    relic: '/equipment/empty_ring.png',
    offhand: '/equipment/empty_shield.png',
    weapon: '/equipment/empty_ring.png',
    helm: '/equipment/empty_helm.png',
    armor: '/equipment/empty_chest.png',
    accessory1: '/equipment/empty_gloves.png',
    accessory2: '/equipment/empty_belt.png',
    accessory3: '/equipment/empty_boots.png',
  };

  private weaponIconSources: Record<WeaponIconKey, string> = {
    dagger: '/weapons/dagger.png',
    sword: '/weapons/sword.png',
    club: '/weapons/club.png',
    great_axe: '/weapons/great_axe.png',
    spear: '/weapons/spear.png',
    hammer: '/weapons/hammer.png',
    bow: '/weapons/bow.png',
    arrow: '/weapons/arrow.png',
    wand: '/weapons/wand.png',
    torch: '/weapons/torch.png',
  };

  getEmptySlotIcon(slotId: string): string {
    return this.emptySlotIcons[slotId] || '';
  }

  getItemIcon(item: Item): string | null {
    if (item.type !== 'weapon') return null;
    return this.getWeaponIcon(item.baseName || item.name);
  }

  private getWeaponIcon(name: string): string | null {
    const key = name.toLowerCase();
    const checks: Array<[WeaponIconKey, string[]]> = [
      ['dagger', ['dagger', 'dirk']],
      ['sword', ['blade', 'sword', 'reaver']],
      ['club', ['club']],
      ['great_axe', ['axe', 'scythe']],
      ['spear', ['spear', 'glaive', 'halberd']],
      ['hammer', ['hammer', 'mace']],
      ['bow', ['bow']],
      ['arrow', ['arrow']],
      ['wand', ['scepter', 'wand']],
      ['torch', ['torch']],
    ];

    for (const [iconKey, keywords] of checks) {
      if (keywords.some(keyword => key.includes(keyword))) {
        return this.weaponIconSources[iconKey];
      }
    }

    return null;
  }

  formatAffix(affix: ItemAffix): string {
    const labels: Record<ItemAffix['type'], string> = {
      flatDamage: 'Damage',
      percentDamage: 'Damage',
      areaFlat: 'Area',
      areaPercent: 'Area',
      cooldownReduction: 'Cooldown Reduction',
      projectiles: 'Projectiles',
      pierce: 'Pierce',
      duration: 'Duration',
      speed: 'Speed',
      projectileSpeed: 'Projectile Speed',
      maxHp: 'Max HP',
      armor: 'Armor',
      hpRegen: 'HP Regen',
      percentHealing: 'Healing',
      magnet: 'Magnet',
      luck: 'Luck',
      percentGold: 'Gold',
      pickupRadius: 'Pickup Radius',
      percentXp: 'XP',
      allStats: 'All Stats',
      ricochetDamage: 'Ricochet Damage',
    };
    const bracket = AFFIX_TIER_BRACKETS[affix.type]?.[affix.tier - 1];
    const sign = affix.value >= 0 ? '+' : '';
    const value = affix.isPercent ? `${affix.value}%` : `${affix.value}`;
    const bracketSuffix = bracket
      ? ` (${bracket.min}${affix.isPercent ? '%' : ''}-${bracket.max}${affix.isPercent ? '%' : ''})`
      : '';
    return `T${affix.tier} ${sign}${value} ${labels[affix.type] ?? affix.type}${bracketSuffix}`;
  }

  formatImplicit(affix: ItemAffix): string {
    const labels: Record<ItemAffix['type'], string> = {
      flatDamage: 'Damage',
      percentDamage: 'Damage',
      areaFlat: 'Area',
      areaPercent: 'Area',
      cooldownReduction: 'Cooldown Reduction',
      projectiles: 'Projectiles',
      pierce: 'Pierce',
      duration: 'Duration',
      speed: 'Speed',
      projectileSpeed: 'Projectile Speed',
      maxHp: 'Max HP',
      armor: 'Armor',
      hpRegen: 'HP Regen',
      percentHealing: 'Healing',
      magnet: 'Magnet',
      luck: 'Luck',
      percentGold: 'Gold',
      pickupRadius: 'Pickup Radius',
      percentXp: 'XP',
      allStats: 'All Stats',
      ricochetDamage: 'Ricochet Damage',
    };
    const sign = affix.value >= 0 ? '+' : '';
    const value = affix.isPercent ? `${affix.value}%` : `${affix.value}`;
    return `Implicit: ${sign}${value} ${labels[affix.type] ?? affix.type}`;
  }
}
