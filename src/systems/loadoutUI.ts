import type { LoadoutData } from '../types';
import type { Item, ItemAffix, StashSlot, ItemRarity } from '../items/types';
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
import { CraftingSystem } from './crafting';

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
  private salvageHoldTimer: number | null = null;
  private salvageHoldInterval: number | null = null;
  private salvageHoldStartTime: number = 0;
  private lastStashHash: string = '';
  private lastLoadoutHash: string = '';
  private isSalvageMode = false;
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

    // Use hashing to skip full re-render of grids if item data hasn't changed
    const stashHash = JSON.stringify(stash);
    const loadoutHash = JSON.stringify(loadout);

    if (stashHash !== this.lastStashHash || loadoutHash !== this.lastLoadoutHash) {
      this.fullRenderGrids(stash, loadout, tooltip as HTMLElement);
      this.lastStashHash = stashHash;
      this.lastLoadoutHash = loadoutHash;
    } else {
      const stashGrid = document.getElementById('stash-grid')!;
      const loadoutGrid = document.getElementById('loadout-grid')!;

      stashGrid.querySelectorAll('.stash-slot').forEach((cell, index) => {
        cell.classList.remove('selected');
        if (this.selected?.type === 'stash' && this.selected.index === index) {
          cell.classList.add('selected');
        }
      });

      loadoutGrid.querySelectorAll('.loadout-slot').forEach((cell) => {
        cell.classList.remove('selected');
        if (this.selected?.type === 'loadout' && this.selected.slot === (cell as HTMLElement).dataset.slotId) {
          cell.classList.add('selected');
        }
      });
    }

    this.updateSummary(loadout);
    this.hideTooltip(tooltip);
    this.renderBulkActions(document.getElementById('item-details-panel')!, stash);
  }



  private fullRenderGrids(stash: StashSlot[], loadout: LoadoutData, tooltip: HTMLElement): void {
    const stashGrid = document.getElementById('stash-grid')!;
    const loadoutGrid = document.getElementById('loadout-grid')!;

    this.hideTooltip(tooltip);
    this.hovered = null;
    this.hoverAnchor = null;
    this.lastPointer = null;

    loadoutGrid.innerHTML = '';
    stashGrid.innerHTML = '';

    stashGrid.onclick = (e) => {
      if (this.isSalvageMode) {
        const target = (e.target as HTMLElement);
        if (!target.closest('.stash-slot') || !target.closest('.filled')) {
          this.isSalvageMode = false;
          document.body.style.cursor = '';
          this.render(stash, loadout);
        }
      }
    };

    loadoutGrid.onclick = () => {
      if (this.isSalvageMode) {
        this.isSalvageMode = false;
        document.body.style.cursor = '';
        this.render(stash, loadout);
      }
    };

    for (const slotId of LOADOUT_SLOT_ORDER) {
      const cell = document.createElement('div');
      cell.className = 'loadout-slot';
      cell.classList.add(`slot-${slotId}`);
      cell.dataset.slotType = 'loadout';
      cell.dataset.slotId = slotId;

      const slotItem = loadout[slotId];
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


  }





  private stopSalvageHold(progressEl: HTMLElement): void {
    if (this.salvageHoldTimer) {
      window.clearTimeout(this.salvageHoldTimer);
      this.salvageHoldTimer = null;
    }
    if (this.salvageHoldInterval) {
      window.clearInterval(this.salvageHoldInterval);
      this.salvageHoldInterval = null;
    }
    progressEl.style.width = '0%';
  }


  private renderBulkActions(container: HTMLElement, stash: StashSlot[]): void {
    container.innerHTML = '';
    const isMobile = window.innerWidth <= 820;

    const title = document.createElement('div');
    title.className = 'loadout-detail-title';
    title.style.textAlign = 'center';
    title.style.fontSize = '12px';
    title.style.marginBottom = '16px';
    title.textContent = 'FORGE ACTIONS';
    container.appendChild(title);

    const desc = document.createElement('div');
    desc.className = 'details-placeholder';
    desc.style.marginTop = '0';
    desc.style.marginBottom = '16px';
    desc.textContent = 'Hold buttons below to batch-salvage items by rarity.';
    container.appendChild(desc);

    const commonCount = stash.filter(s => s?.rarity === 'common').length;
    const magicCount = stash.filter(s => s?.rarity === 'magic').length;

    this.createBulkButton(container, isMobile ? 'SALVAGE\nCOMMON' : 'SALVAGE ALL COMMONS', ['common'], commonCount);
    this.createBulkButton(container, isMobile ? 'SALVAGE\nMAGIC' : 'SALVAGE ALL MAGIC', ['magic'], magicCount);
    this.createBulkButton(container, isMobile ? 'SALVAGE\nC+M' : 'SALVAGE LOW-TIER (C+M)', ['common', 'magic'], commonCount + magicCount);

    const separator = document.createElement('div');
    separator.className = 'forge-separator';
    separator.style.height = '1px';
    separator.style.background = 'rgba(255, 255, 255, 0.1)';
    separator.style.margin = '20px 0';
    container.appendChild(separator);

    const manualSalvageBtn = document.createElement('button');
    manualSalvageBtn.className = 'btn-salvage';
    manualSalvageBtn.style.marginTop = '10px';
    manualSalvageBtn.innerHTML = `
      <span class="btn-icon">🔨</span>
      <span class="btn-text">${this.isSalvageMode ? (isMobile ? 'CANCEL' : 'CANCEL SALVAGE') : (isMobile ? 'TAP TO\nSALVAGE' : 'MANUAL SALVAGE')}</span>
    `;
    if (this.isSalvageMode) {
      manualSalvageBtn.style.background = 'rgba(255, 100, 100, 0.3)';
    }
    manualSalvageBtn.onclick = () => this.toggleSalvageMode();
    container.appendChild(manualSalvageBtn);

    if (this.isSalvageMode) {
      const modeDesc = document.createElement('div');
      modeDesc.className = 'salvage-mode-desc';
      modeDesc.style.marginTop = '10px';
      modeDesc.style.fontSize = '11px';
      modeDesc.style.color = '#ff6b6b';
      modeDesc.style.textAlign = 'center';
      modeDesc.textContent = isMobile ? 'Tap item to salvage' : 'Click an item to salvage instantly, or click empty space to cancel.';
      container.appendChild(modeDesc);
    }
  }

  private createBulkButton(container: HTMLElement, label: string, rarities: ItemRarity[], count: number): void {
    const btn = document.createElement('button');
    btn.className = 'btn-salvage';
    btn.style.marginTop = '10px';

    if (count === 0) {
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
    }

    const progress = document.createElement('div');
    progress.className = 'salvage-progress';
    btn.appendChild(progress);

    const text = document.createElement('span');
    text.className = 'btn-text';
    // Support multi-line labels by splitting on newlines
    const lines = label.split('\n');
    if (lines.length > 1) {
      text.innerHTML = lines.map(l => `<span>${l}</span>`).join('') + ` <span class="btn-count">(${count})</span>`;
    } else {
      text.textContent = `${label} (${count})`;
    }
    btn.appendChild(text);

    const start = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.startBulkSalvageHold(rarities, progress, btn);
    };

    const stop = () => {
      this.stopSalvageHold(progress);
    };

    btn.onmousedown = start;
    btn.ontouchstart = start;
    btn.onmouseup = stop;
    btn.onmouseleave = stop;
    btn.ontouchend = stop;

    container.appendChild(btn);
  }

  private startBulkSalvageHold(rarities: ItemRarity[], progressEl: HTMLElement, btnEl: HTMLElement): void {
    this.stopSalvageHold(progressEl);

    const DURATION = 1200; // Longer for bulk
    this.salvageHoldStartTime = Date.now();

    this.salvageHoldInterval = window.setInterval(() => {
      const elapsed = Date.now() - this.salvageHoldStartTime;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      progressEl.style.width = `${pct}%`;
    }, 16);

    this.salvageHoldTimer = window.setTimeout(() => {
      this.stopSalvageHold(progressEl);
      btnEl.classList.add('complete');
      setTimeout(() => {
        const result = CraftingSystem.salvageAllByRarity(rarities);
        console.log(`Salvaged ${result.count} items for ${result.scrap} scrap.`);
        this.selected = null;
        this.render(SaveData.data.stash, SaveData.data.loadout);
      }, 150);
    }, DURATION);
  }

  private toggleSalvageMode(): void {
    this.isSalvageMode = !this.isSalvageMode;
    document.body.style.cursor = this.isSalvageMode ? 'url(/weapons/hammer.png), crosshair' : '';
    this.render(SaveData.data.stash, SaveData.data.loadout);
  }

  private handleSlotClick(selection: Selection, stash: StashSlot[], loadout: LoadoutData): void {
    if (this.isSalvageMode) {
      if (selection.type === 'stash') {
        const item = stash[selection.index];
        if (item) {
          CraftingSystem.salvage(selection.index);
          this.render(SaveData.data.stash, SaveData.data.loadout);
        }
      }
      return;
    }

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

  private handleSingleClick(_selection: Selection, _stash: StashSlot[], _loadout: LoadoutData): void {
    // Inspection removed in favor of tooltips
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

    // Update scrap displays
    const scrapVal = SaveData.data.scrap.toString();
    ['shop-scrap-display', 'stash-scrap-counter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.textContent !== scrapVal) {
          el.classList.remove('counter-pop');
          void el.offsetWidth; // Trigger reflow
          el.classList.add('counter-pop');
        }
        el.textContent = scrapVal;
      }
    });

    const hudScrap = document.getElementById('hud-scrap');
    if (hudScrap) {
      if (hudScrap.textContent !== `⚙️ ${scrapVal}`) {
        hudScrap.classList.remove('counter-pop');
        void hudScrap.offsetWidth;
        hudScrap.classList.add('counter-pop');
      }
      hudScrap.textContent = `⚙️ ${scrapVal}`;
    }
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

  private resolveSelectionItem(selection: Selection, stash: StashSlot[], loadout: LoadoutData): Item | null {
    if (selection.type === 'stash') {
      return stash[selection.index] ?? null;
    }
    return loadout[selection.slot] ?? null;
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
