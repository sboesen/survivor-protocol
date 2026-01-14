import type { Item, ItemAffix, StashSlot } from '../../items/types';
import type { LoadoutData } from '../../types';
import { AFFIX_TIER_BRACKETS } from '../../items/affixTables';
import { CHARACTERS } from '../../data/characters';
import { LOADOUT_SLOT_LABELS, LOADOUT_SLOT_ORDER, LOADOUT_SLOT_TYPES, type LoadoutSlotId } from '../../items/loadout';

type Selection =
  | { type: 'stash'; index: number }
  | { type: 'loadout'; slot: LoadoutSlotId };

export class TooltipSystem {
  private hovered: Selection | null = null;
  private lastPointer: { x: number; y: number } | null = null;
  private altCompare = false;

  getHovered(): Selection | null {
    return this.hovered;
  }

  getAltCompare(): boolean {
    return this.altCompare;
  }

  setAltCompare(value: boolean): void {
    this.altCompare = value;
  }

  setLastPointer(point: { x: number; y: number } | null): void {
    this.lastPointer = point;
  }

  showTooltip(
    selection: Selection,
    tooltip: HTMLElement | null,
    stash: StashSlot[],
    loadout: LoadoutData,
    event?: MouseEvent | null,
    fallbackEl?: HTMLElement
  ): void {
    if (!tooltip) return;

    this.hovered = selection;
    if (event) {
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.altCompare = event.altKey;
    }

    tooltip.innerHTML = '';
    tooltip.className = 'loadout-tooltip';
    const item = this.resolveSelectionItem(selection, stash, loadout);
    const compare = this.getCompareItem(selection, item, loadout);
    if (compare) {
      tooltip.classList.add('compare');
      this.renderCompareDetail(tooltip, item!, compare.item, compare.label);
    } else {
      this.applyTooltipTheme(tooltip, item);
      this.renderDetail(tooltip, selection, stash, loadout);
    }

    if (!tooltip.innerHTML) {
      this.clearHover(tooltip);
      return;
    }

    tooltip.style.display = 'block';
    this.updateTooltipPosition(tooltip, event ?? undefined, fallbackEl);
  }

  updateTooltipPosition(
    tooltip: HTMLElement | null,
    event?: MouseEvent,
    fallbackEl?: HTMLElement
  ): void {
    if (!tooltip || tooltip.style.display === 'none') return;

    let x = 0;
    let y = 0;
    if (event) {
      x = event.clientX + 12;
      y = event.clientY + 12;
      this.lastPointer = { x: event.clientX, y: event.clientY };
    } else if (this.lastPointer) {
      x = this.lastPointer.x + 12;
      y = this.lastPointer.y + 12;
    } else if (fallbackEl) {
      const rect = fallbackEl.getBoundingClientRect();
      x = rect.right + 12;
      y = rect.top + 12;
    }

    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const maxX = window.innerWidth - width - 8;
    const maxY = window.innerHeight - height - 8;

    if (x > maxX) x = maxX;
    if (y > maxY) y = maxY;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  hideTooltip(tooltip: HTMLElement | null): void {
    if (!tooltip) return;
    tooltip.innerHTML = '';
    tooltip.className = 'loadout-tooltip';
    tooltip.style.display = 'none';
  }

  clearHover(tooltip: HTMLElement | null): void {
    this.hovered = null;
    this.lastPointer = null;
    this.hideTooltip(tooltip);
  }

  private getCompareItem(
    selection: Selection,
    item: Item | null,
    loadout: LoadoutData
  ): { item: Item; label: string } | null {
    if (!item || selection.type !== 'stash' || !this.altCompare) return null;

    if (item.type === 'weapon') {
      return loadout.weapon ? { item: loadout.weapon, label: 'WEAPON' } : null;
    }
    if (item.type === 'helm') {
      return loadout.helm ? { item: loadout.helm, label: 'HELM' } : null;
    }
    if (item.type === 'armor') {
      return loadout.armor ? { item: loadout.armor, label: 'ARMOR' } : null;
    }
    if (item.type === 'relic') {
      return loadout.relic ? { item: loadout.relic, label: 'RELIC' } : null;
    }
    if (item.type === 'accessory') {
      const accessorySlots = LOADOUT_SLOT_ORDER.filter(slot => LOADOUT_SLOT_TYPES[slot] === 'accessory');
      for (const slot of accessorySlots) {
        const equipped = loadout[slot];
        if (equipped) {
          return { item: equipped, label: LOADOUT_SLOT_LABELS[slot] };
        }
      }
    }

    return null;
  }

  private renderCompareDetail(
    tooltip: HTMLElement,
    stashItem: Item,
    equippedItem: Item,
    equippedLabel: string
  ): void {
    const compare = document.createElement('div');
    compare.className = 'loadout-compare';

    const stashPanel = document.createElement('div');
    stashPanel.className = 'loadout-compare-panel';
    stashPanel.classList.add(`tooltip-${stashItem.rarity}`);
    if (stashItem.type === 'relic') stashPanel.classList.add('tooltip-relic');
    this.populateDetail(stashPanel, stashItem, 'STASH ITEM');

    const equippedPanel = document.createElement('div');
    equippedPanel.className = 'loadout-compare-panel';
    equippedPanel.classList.add(`tooltip-${equippedItem.rarity}`);
    if (equippedItem.type === 'relic') equippedPanel.classList.add('tooltip-relic');
    this.populateDetail(equippedPanel, equippedItem, `EQUIPPED (${equippedLabel})`);

    compare.appendChild(stashPanel);
    compare.appendChild(equippedPanel);
    tooltip.appendChild(compare);
  }

  private populateDetail(detailEl: HTMLElement, item: Item, heading?: string): void {
    if (heading) {
      const label = document.createElement('div');
      label.className = 'loadout-compare-label';
      label.textContent = heading;
      detailEl.appendChild(label);
    }

    const title = document.createElement('div');
    title.className = 'loadout-detail-title';
    title.textContent = item.name;

    const meta = document.createElement('div');
    meta.className = 'loadout-detail-meta';
    meta.textContent = `${item.rarity.toUpperCase()} ${item.type.toUpperCase()}`;

    const base = document.createElement('div');
    base.className = 'loadout-detail-base';
    base.textContent = `Base: ${item.baseName} (T${item.tier})`;

    const stats = document.createElement('div');
    stats.className = 'loadout-detail-stats';

    const classLine = item.type === 'relic' && item.relicClassId
      ? (() => {
          const line = document.createElement('div');
          line.className = 'loadout-detail-base';
          line.textContent = `Class: ${CHARACTERS[item.relicClassId]?.name ?? item.relicClassId}`;
          return line;
        })()
      : null;

    const hasRelicEffect = item.type === 'relic' && item.relicEffectDescription && item.relicEffectDescription.length > 0;
    if (hasRelicEffect) {
      const effectTitle = document.createElement('div');
      effectTitle.className = 'affix-line implicit-line';
      effectTitle.textContent = `Unique: ${item.relicEffectName ?? 'Relic Effect'}`;
      stats.appendChild(effectTitle);
      if (item.relicEffectDescription) {
        item.relicEffectDescription.forEach(desc => {
          const line = document.createElement('div');
          line.className = 'affix-line implicit-line';
          line.textContent = desc;
          stats.appendChild(line);
        });
      }
    }

    const implicits = item.implicits ?? [];
    if (implicits.length > 0) {
      implicits.forEach(affix => {
        const line = document.createElement('div');
        line.className = 'affix-line implicit-line';
        line.textContent = this.formatImplicit(affix);
        stats.appendChild(line);
      });
    }

    if (item.affixes.length > 0) {
      item.affixes.forEach(affix => {
        const line = document.createElement('div');
        line.className = `affix-line tier-${affix.tier}`;
        line.textContent = this.formatAffix(affix);
        stats.appendChild(line);
      });
    } else if (implicits.length === 0 && !hasRelicEffect) {
      stats.textContent = 'No affixes.';
    }

    detailEl.appendChild(title);
    detailEl.appendChild(meta);
    detailEl.appendChild(base);
    if (classLine) {
      detailEl.appendChild(classLine);
    }
    detailEl.appendChild(stats);
  }

  private renderDetail(
    detailEl: HTMLElement,
    selection: Selection,
    stash: StashSlot[],
    loadout: LoadoutData
  ): void {
    detailEl.innerHTML = '';

    if (selection.type === 'stash') {
      const item = stash[selection.index];
      if (!item) {
        return;
      }
      this.populateDetail(detailEl, item);
      return;
    }

    const slotId = selection.slot;
    const item = loadout[slotId];
    if (item) {
      this.populateDetail(detailEl, item);
      return;
    }

    if (LOADOUT_SLOT_TYPES[slotId] === 'relic') {
      return;
    }
  }

  private applyTooltipTheme(tooltip: HTMLElement, item: Item | null): void {
    tooltip.className = 'loadout-tooltip';
    if (!item) {
      tooltip.classList.add('tooltip-neutral');
      return;
    }
    if (item.type === 'relic') {
      tooltip.classList.add('tooltip-relic');
      return;
    }
    tooltip.classList.add(`tooltip-${item.rarity}`);
  }

  private formatAffix(affix: ItemAffix): string {
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

  private formatImplicit(affix: ItemAffix): string {
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

  private resolveSelectionItem(selection: Selection, stash: StashSlot[], loadout: LoadoutData): Item | null {
    if (selection.type === 'stash') {
      return stash[selection.index] ?? null;
    }
    return loadout[selection.slot] ?? null;
  }
}
