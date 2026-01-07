import type { LoadoutData } from '../types';
import type { Item, ItemAffix, StashSlot } from '../items/types';
import { AFFIX_TIER_BRACKETS } from '../items/affixTables';
import { ItemStats } from '../items/stats';
import { CHARACTERS } from '../data/characters';
import {
  LOADOUT_SLOT_LABELS,
  LOADOUT_SLOT_ORDER,
  LOADOUT_SLOT_TYPES,
  type LoadoutSlotId,
  isSlotCompatible,
} from '../items/loadout';
import { SaveData } from './saveData';

type Selection =
  | { type: 'stash'; index: number }
  | { type: 'loadout'; slot: LoadoutSlotId };

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

class LoadoutUISystem {
  private selected: Selection | null = null;
  private pendingClick: { selection: Selection; timer: number } | null = null;
  private hovered: Selection | null = null;
  private hoverAnchor: HTMLElement | null = null;
  private lastPointer: { x: number; y: number } | null = null;
  private altCompare = false;
  private listenersBound = false;
  private currentStash: StashSlot[] = [];
  private currentLoadout: LoadoutData | null = null;
  private currentTooltip: HTMLElement | null = null;
  private weaponIconSources: Record<WeaponIconKey, string> = {
    dagger: new URL('../assets/sprites/weapons/dagger.png', import.meta.url).href,
    sword: new URL('../assets/sprites/weapons/sword.png', import.meta.url).href,
    club: new URL('../assets/sprites/weapons/club.png', import.meta.url).href,
    great_axe: new URL('../assets/sprites/weapons/great_axe.png', import.meta.url).href,
    spear: new URL('../assets/sprites/weapons/spear.png', import.meta.url).href,
    hammer: new URL('../assets/sprites/weapons/hammer.png', import.meta.url).href,
    bow: new URL('../assets/sprites/weapons/bow.png', import.meta.url).href,
    arrow: new URL('../assets/sprites/weapons/arrow.png', import.meta.url).href,
    wand: new URL('../assets/sprites/weapons/wand.png', import.meta.url).href,
    torch: new URL('../assets/sprites/weapons/torch.png', import.meta.url).href,
  };

  private bindListeners(): void {
    if (this.listenersBound) return;
    this.listenersBound = true;
    window.addEventListener('keydown', this.handleAltKey);
    window.addEventListener('keyup', this.handleAltKey);
  }

  render(stash: StashSlot[], loadout: LoadoutData): void {
    const stashGrid = document.getElementById('stash-grid');
    const loadoutGrid = document.getElementById('loadout-grid');
    const tooltip = document.getElementById('loadout-tooltip');

    if (!stashGrid || !loadoutGrid) return;

    this.currentStash = stash;
    this.currentLoadout = loadout;
    this.currentTooltip = tooltip;
    this.bindListeners();

    this.hideTooltip(tooltip);
    this.hovered = null;
    this.hoverAnchor = null;
    this.lastPointer = null;
    loadoutGrid.innerHTML = '';
    stashGrid.innerHTML = '';

    for (const slotId of LOADOUT_SLOT_ORDER) {
      const slotItem = loadout[slotId];
      const cell = document.createElement('div');
      cell.className = 'loadout-slot';
      cell.classList.add(`slot-${slotId}`);
      cell.dataset.slotType = 'loadout';
      cell.dataset.slotId = slotId;

      if (this.selected?.type === 'loadout' && this.selected.slot === slotId) {
        cell.classList.add('selected');
      }

      if (slotItem) {
        cell.classList.add('filled');
        cell.classList.add(`rarity-${slotItem.rarity}`);
        if (slotItem.type === 'relic') cell.classList.add('type-relic');
      }

      const label = document.createElement('div');
      label.className = 'slot-label';
      label.textContent = LOADOUT_SLOT_LABELS[slotId];

      const body = document.createElement('div');
      body.className = 'slot-item';

      cell.appendChild(label);

      if (slotItem) {
        const iconSrc = this.getItemIcon(slotItem);
        if (iconSrc) {
          cell.classList.add('has-icon');
          const icon = document.createElement('img');
          icon.className = 'slot-icon';
          icon.src = iconSrc;
          icon.alt = '';
          cell.appendChild(icon);
        }
        body.textContent = slotItem.name;
      } else {
        body.textContent = 'Empty';
      }

      cell.appendChild(body);

      if (slotItem) {
        cell.draggable = true;
        cell.ondragstart = (event) => this.handleDragStart(event, 'loadout', slotId);
      }

      cell.ondragover = (event) => this.handleDragOver(event, cell);
      cell.ondragleave = () => cell.classList.remove('drag-over');
      cell.ondrop = (event) => this.handleDrop(event, 'loadout', slotId, stash, loadout, cell);

      cell.onmouseenter = (event) => this.showTooltip({ type: 'loadout', slot: slotId }, tooltip, stash, loadout, event);
      cell.onmousemove = (event) => this.updateTooltipPosition(tooltip, event);
      cell.onmouseleave = () => this.clearHover(tooltip);
      cell.onfocus = () => this.showTooltip({ type: 'loadout', slot: slotId }, tooltip, stash, loadout, null, cell);
      cell.onblur = () => this.hideTooltip(tooltip);
      cell.onclick = () => {
        this.handleSlotClick({ type: 'loadout', slot: slotId }, stash, loadout);
      };

      loadoutGrid.appendChild(cell);
    }

    stash.forEach((slot, index) => {
      const cell = document.createElement('div');
      cell.className = 'stash-slot';
      cell.dataset.slotType = 'stash';
      cell.dataset.slotId = index.toString();

      if (this.selected?.type === 'stash' && this.selected.index === index) {
        cell.classList.add('selected');
      }

      if (slot) {
        cell.classList.add('filled');
        cell.classList.add(`rarity-${slot.rarity}`);
        if (slot.type === 'relic') cell.classList.add('type-relic');
        const iconSrc = this.getItemIcon(slot);
        if (iconSrc) {
          cell.classList.add('has-icon');
          const icon = document.createElement('img');
          icon.className = 'stash-icon';
          icon.src = iconSrc;
          icon.alt = '';
          cell.appendChild(icon);
        }
        const name = document.createElement('div');
        name.className = 'stash-item-name';
        name.textContent = slot.name;
        cell.appendChild(name);
        cell.draggable = true;
        cell.ondragstart = (event) => this.handleDragStart(event, 'stash', index);
      }

      cell.ondragover = (event) => this.handleDragOver(event, cell);
      cell.ondragleave = () => cell.classList.remove('drag-over');
      cell.ondrop = (event) => this.handleDrop(event, 'stash', index, stash, loadout, cell);

      cell.onmouseenter = (event) => this.showTooltip({ type: 'stash', index }, tooltip, stash, loadout, event);
      cell.onmousemove = (event) => this.updateTooltipPosition(tooltip, event);
      cell.onmouseleave = () => this.clearHover(tooltip);
      cell.onfocus = () => this.showTooltip({ type: 'stash', index }, tooltip, stash, loadout, null, cell);
      cell.onblur = () => this.hideTooltip(tooltip);
      cell.onclick = () => {
        this.handleSlotClick({ type: 'stash', index }, stash, loadout);
      };

      stashGrid.appendChild(cell);
    });

    this.updateSummary(loadout);
    this.hideTooltip(tooltip);
  }

  private handleSlotClick(selection: Selection, stash: StashSlot[], loadout: LoadoutData): void {
    if (this.pendingClick) {
      const same = this.isSameSelection(this.pendingClick.selection, selection);
      window.clearTimeout(this.pendingClick.timer);

      if (same) {
        this.pendingClick = null;
        this.handleDoubleClick(selection, stash, loadout);
        return;
      }

      this.handleSingleClick(this.pendingClick.selection, stash, loadout);
      this.pendingClick = null;
    }

    const timer = window.setTimeout(() => {
      this.pendingClick = null;
      this.handleSingleClick(selection, stash, loadout);
    }, 250);

    this.pendingClick = { selection, timer };
  }

  private handleAltKey = (event: KeyboardEvent): void => {
    const next = event.altKey;
    if (this.altCompare === next) return;
    this.altCompare = next;
    if (!this.hovered || !this.currentLoadout || !this.currentTooltip) return;
    this.showTooltip(this.hovered, this.currentTooltip, this.currentStash, this.currentLoadout, null, this.hoverAnchor ?? undefined);
  };

  private handleSingleClick(selection: Selection, stash: StashSlot[], loadout: LoadoutData): void {
    if (selection.type === 'stash') {
      this.handleStashClick(selection.index, stash, loadout);
    } else {
      this.handleLoadoutClick(selection.slot, stash, loadout);
    }
  }

  private handleDoubleClick(selection: Selection, stash: StashSlot[], loadout: LoadoutData): void {
    if (selection.type === 'stash') {
      this.handleStashDoubleClick(selection.index, stash, loadout);
    } else {
      this.handleLoadoutDoubleClick(selection.slot, stash, loadout);
    }
  }

  private isSameSelection(a: Selection, b: Selection): boolean {
    if (a.type !== b.type) return false;
    return a.type === 'stash' ? a.index === (b as { index: number }).index : a.slot === (b as { slot: LoadoutSlotId }).slot;
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
    };
    const sign = affix.value >= 0 ? '+' : '';
    const value = affix.isPercent ? `${affix.value}%` : `${affix.value}`;
    return `Implicit: ${sign}${value} ${labels[affix.type] ?? affix.type}`;
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

  private getItemIcon(item: Item): string | null {
    if (item.type !== 'weapon') return null;
    return this.getWeaponIcon(item.baseName || item.name);
  }

  private updateSummary(loadout: LoadoutData): void {
    const summary = document.getElementById('loadout-summary');
    if (!summary) return;

    const stats = ItemStats.calculate(loadout);

    const formatRatio = (value: number): string => {
      const pct = Math.round(value * 100);
      const sign = pct >= 0 ? '+' : '';
      return `${sign}${pct}%`;
    };

    const formatPercentValue = (value: number): string => {
      const pct = Math.round(value);
      const sign = pct >= 0 ? '+' : '';
      return `${sign}${pct}%`;
    };

    const formatSigned = (value: number): string => {
      const rounded = Math.round(value);
      const sign = rounded >= 0 ? '+' : '';
      return `${sign}${rounded}`;
    };

    const formatCooldown = (value: number): string => {
      const pct = Math.round(Math.abs(value) * 100);
      if (pct === 0) return '0%';
      const sign = value >= 0 ? '-' : '+';
      return `${sign}${pct}%`;
    };

    const selectedCharId = SaveData.data.selectedChar ?? 'wizard';
    const selectedChar = CHARACTERS[selectedCharId] ?? CHARACTERS.wizard;
    const shopSpeed = SaveData.data.shop?.speed ?? 0;
    const baseSpeed = 7.5 * (1 + shopSpeed * 0.05) * selectedChar.spdMod;
    const speedRatio = baseSpeed > 0 ? stats.speed / baseSpeed : 0;

    const updateValue = (id: string, value: string): void => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    updateValue('summary-might', formatRatio(stats.percentDamage + stats.allStats));
    updateValue('summary-cooldown', formatCooldown(stats.cooldownReduction));
    updateValue('summary-area', formatRatio(stats.areaPercent));
    updateValue('summary-luck', formatPercentValue(stats.luck));
    updateValue('summary-speed', formatRatio(speedRatio + stats.allStats));
    updateValue('summary-amount', formatSigned(stats.projectiles));
    updateValue('summary-greed', formatRatio(stats.percentGold));
    updateValue('summary-armor', formatSigned(stats.armor));
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
    } else if (implicits.length === 0) {
      stats.textContent = 'No affixes.';
    }

    detailEl.appendChild(title);
    detailEl.appendChild(meta);
    detailEl.appendChild(base);
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

  private showTooltip(
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
    this.hoverAnchor = fallbackEl ?? (event?.currentTarget as HTMLElement | undefined) ?? null;

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

  private updateTooltipPosition(
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

  private hideTooltip(tooltip: HTMLElement | null): void {
    if (!tooltip) return;
    tooltip.innerHTML = '';
    tooltip.className = 'loadout-tooltip';
    tooltip.style.display = 'none';
  }

  private clearHover(tooltip: HTMLElement | null): void {
    this.hovered = null;
    this.hoverAnchor = null;
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

  private handleDragStart(
    event: DragEvent,
    sourceType: 'stash' | 'loadout',
    sourceId: number | LoadoutSlotId
  ): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', JSON.stringify({
      sourceType,
      sourceId,
    }));
    event.dataTransfer.effectAllowed = 'move';
  }

  private handleDragOver(event: DragEvent, cell: HTMLElement): void {
    event.preventDefault();
    cell.classList.add('drag-over');
  }

  private handleDrop(
    event: DragEvent,
    targetType: 'stash' | 'loadout',
    targetId: number | LoadoutSlotId,
    stash: StashSlot[],
    loadout: LoadoutData,
    cell: HTMLElement
  ): void {
    event.preventDefault();
    cell.classList.remove('drag-over');
    if (!event.dataTransfer) return;
    const raw = event.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as {
        sourceType: 'stash' | 'loadout';
        sourceId: number | LoadoutSlotId;
      };
      this.moveItem(payload.sourceType, payload.sourceId, targetType, targetId, stash, loadout);
    } catch {
      return;
    }
  }

  private getItemAt(
    type: 'stash' | 'loadout',
    id: number | LoadoutSlotId,
    stash: StashSlot[],
    loadout: LoadoutData
  ): Item | null {
    if (type === 'stash') return stash[id as number] ?? null;
    return loadout[id as LoadoutSlotId] ?? null;
  }

  private setItemAt(
    type: 'stash' | 'loadout',
    id: number | LoadoutSlotId,
    item: Item | null,
    stash: StashSlot[],
    loadout: LoadoutData
  ): void {
    if (type === 'stash') {
      stash[id as number] = item;
    } else {
      loadout[id as LoadoutSlotId] = item;
    }
  }

  private moveItem(
    sourceType: 'stash' | 'loadout',
    sourceId: number | LoadoutSlotId,
    targetType: 'stash' | 'loadout',
    targetId: number | LoadoutSlotId,
    stash: StashSlot[],
    loadout: LoadoutData
  ): void {
    const sourceItem = this.getItemAt(sourceType, sourceId, stash, loadout);
    if (!sourceItem) return;
    const targetItem = this.getItemAt(targetType, targetId, stash, loadout);

    if (targetType === 'loadout' && !isSlotCompatible(targetId as LoadoutSlotId, sourceItem)) {
      return;
    }

    if (sourceType === 'loadout' && targetType === 'loadout' && targetItem) {
      if (!isSlotCompatible(sourceId as LoadoutSlotId, targetItem)) return;
    }

    this.setItemAt(sourceType, sourceId, targetItem, stash, loadout);
    this.setItemAt(targetType, targetId, sourceItem, stash, loadout);
    this.selected = null;
    SaveData.save();
    this.render(stash, loadout);
  }

  private resolveSelectionItem(
    selection: Selection,
    stash: StashSlot[],
    loadout: LoadoutData
  ): Item | null {
    if (selection.type === 'stash') {
      return stash[selection.index] ?? null;
    }
    return loadout[selection.slot] ?? null;
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

  private handleStashClick(index: number, stash: StashSlot[], loadout: LoadoutData): void {
    const clickedItem = stash[index];

    if (!this.selected) {
      if (clickedItem) {
        this.selected = { type: 'stash', index };
      }
      this.render(stash, loadout);
      return;
    }

    if (this.selected.type === 'stash') {
      if (this.selected.index === index) {
        this.selected = null;
      } else {
        const sourceItem = stash[this.selected.index];
        stash[this.selected.index] = clickedItem ?? null;
        stash[index] = sourceItem ?? null;
        this.selected = null;
        SaveData.save();
      }
      this.render(stash, loadout);
      return;
    }

    const loadoutItem = loadout[this.selected.slot];
    loadout[this.selected.slot] = clickedItem ?? null;
    stash[index] = loadoutItem ?? null;
    this.selected = null;
    SaveData.save();
    this.render(stash, loadout);
  }

  private handleStashDoubleClick(index: number, stash: StashSlot[], loadout: LoadoutData): void {
    const item = stash[index];
    if (!item) return;

    const slotId = this.findAutoEquipSlot(item, loadout);
    if (!slotId) return;

    const targetItem = loadout[slotId];
    loadout[slotId] = item;
    stash[index] = targetItem ?? null;
    this.selected = null;
    SaveData.save();
    this.render(stash, loadout);
  }

  private handleLoadoutClick(slotId: LoadoutSlotId, stash: StashSlot[], loadout: LoadoutData): void {
    const clickedItem = loadout[slotId];

    if (!this.selected) {
      if (clickedItem) {
        this.selected = { type: 'loadout', slot: slotId };
      }
      this.render(stash, loadout);
      return;
    }

    if (this.selected.type === 'loadout') {
      if (this.selected.slot === slotId) {
        this.selected = null;
        this.render(stash, loadout);
        return;
      }

      const sourceItem = loadout[this.selected.slot];
      if (sourceItem && isSlotCompatible(slotId, sourceItem)) {
        if (!clickedItem || isSlotCompatible(this.selected.slot, clickedItem)) {
          loadout[this.selected.slot] = clickedItem ?? null;
          loadout[slotId] = sourceItem;
          SaveData.save();
        }
      }
      this.selected = null;
      this.render(stash, loadout);
      return;
    }

    const sourceItem = stash[this.selected.index];
    if (!sourceItem) {
      this.selected = null;
      this.render(stash, loadout);
      return;
    }

    if (!isSlotCompatible(slotId, sourceItem)) {
      this.render(stash, loadout);
      return;
    }

    stash[this.selected.index] = clickedItem ?? null;
    loadout[slotId] = sourceItem;
    this.selected = null;
    SaveData.save();
    this.render(stash, loadout);
  }

  private handleLoadoutDoubleClick(slotId: LoadoutSlotId, stash: StashSlot[], loadout: LoadoutData): void {
    const loadoutItem = loadout[slotId];

    if (this.selected?.type === 'stash') {
      const sourceItem = stash[this.selected.index];
      if (sourceItem && isSlotCompatible(slotId, sourceItem)) {
        stash[this.selected.index] = loadoutItem ?? null;
        loadout[slotId] = sourceItem;
        this.selected = null;
        SaveData.save();
        this.render(stash, loadout);
        return;
      }
    }

    if (!loadoutItem) return;
    const emptyIndex = stash.findIndex(slot => slot === null);
    if (emptyIndex !== -1) {
      stash[emptyIndex] = loadoutItem;
      loadout[slotId] = null;
      this.selected = null;
      SaveData.save();
      this.render(stash, loadout);
      return;
    }

    const swapIndex = stash.findIndex(slot => slot && slot.type === loadoutItem.type);
    if (swapIndex === -1) return;
    const swapItem = stash[swapIndex];
    stash[swapIndex] = loadoutItem;
    loadout[slotId] = swapItem ?? null;
    this.selected = null;
    SaveData.save();
    this.render(stash, loadout);
  }

  private findAutoEquipSlot(item: Item, loadout: LoadoutData): LoadoutSlotId | null {
    const compatible = LOADOUT_SLOT_ORDER.filter(slot => isSlotCompatible(slot, item));
    if (compatible.length === 0) return null;
    const emptySlot = compatible.find(slot => !loadout[slot]);
    return emptySlot ?? compatible[0];
  }
}

export const LoadoutUI = new LoadoutUISystem();
