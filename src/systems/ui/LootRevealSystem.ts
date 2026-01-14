import type { Item } from '../../items/types';

export interface LootRevealOptions {
  items: Item[];
  grid: HTMLElement;
  tooltip: HTMLElement | null;
  revealBtn: HTMLButtonElement | null;
  continueBtn?: HTMLButtonElement | null;
  onContinue?: () => void;
  confettiLayer?: HTMLElement | null;
  autoReveal?: boolean;
}

interface LootRevealState {
  revealed: boolean;
  confettiTriggered: boolean;
  activeTooltipId: string | null;
}

export class LootRevealSystem {
  private state: LootRevealState;
  private options: LootRevealOptions;
  private itemButtons: HTMLButtonElement[] = [];

  private readonly AFFIX_LABELS: Record<Item['affixes'][0]['type'], string> = {
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

  constructor(options: LootRevealOptions) {
    this.state = {
      revealed: false,
      confettiTriggered: false,
      activeTooltipId: null,
    };
    this.options = options;
    this.setup();
  }

  private setup(): void {
    const {
      items,
      grid,
      tooltip,
      revealBtn,
      continueBtn,
      confettiLayer,
      autoReveal,
    } = this.options;

    const hideTooltip = (): void => {
      this.state.activeTooltipId = null;
      this.hideExtractTooltip(tooltip);
    };

    const showTooltip = (item: Item, event?: MouseEvent, anchor?: HTMLElement): void => {
      if (!tooltip) return;
      this.state.activeTooltipId = item.id;
      this.showExtractTooltip(item, tooltip, event, anchor);
    };

    grid.innerHTML = '';
    grid.classList.remove('revealing');

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'loot-empty';
      empty.textContent = 'No secured items.';
      grid.appendChild(empty);
      if (revealBtn) {
        revealBtn.disabled = true;
        revealBtn.classList.add('btn-disabled');
      }
      if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.classList.remove('btn-disabled');
      }
      hideTooltip();
      return;
    }

    this.itemButtons = [];
    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = `extract-item rarity-${item.rarity} ${item.type === 'relic' ? 'type-relic' : ''}`;
      button.textContent = 'VEILED';

      button.onmouseenter = (event) => {
        if (!this.state.revealed) return;
        showTooltip(item, event);
      };
      button.onmousemove = (event) => {
        if (!this.state.revealed) return;
        showTooltip(item, event);
      };
      button.onmouseleave = () => {
        if (this.state.activeTooltipId === item.id) hideTooltip();
      };
      button.onfocus = () => {
        if (!this.state.revealed) return;
        showTooltip(item, undefined, button);
      };
      button.onblur = () => hideTooltip();
      button.onclick = (event) => {
        if (!this.state.revealed) return;
        if (this.state.activeTooltipId === item.id) {
          hideTooltip();
          return;
        }
        showTooltip(item, event);
        event.stopPropagation();
      };

      grid.appendChild(button);
      this.itemButtons[index] = button;
    });

    if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.classList.add('btn-disabled');
    }
    if (revealBtn) {
      revealBtn.disabled = false;
      revealBtn.classList.remove('btn-disabled');
    }

    const reveal = () => {
      if (this.state.revealed) return;
      this.state.revealed = true;
      hideTooltip();
      if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.classList.remove('btn-disabled');
      }
      if (revealBtn) {
        revealBtn.disabled = true;
        revealBtn.classList.add('btn-disabled');
      }
      grid.classList.add('revealing');

      const { items } = this.options;
      this.itemButtons.forEach((button, index) => {
        const item = items[index];
        const delay = index * 80;
        button.classList.add('unveiling');
        window.setTimeout(() => {
          button.classList.add('revealed');
          button.innerHTML = `
            ${item.type === 'relic' ? '<span class="extract-badge">★</span>' : ''}
            <span class="extract-item-name">${item.name}</span>
            <span class="extract-item-meta">${item.rarity.toUpperCase()} ${item.type.toUpperCase()}</span>
          `;
          button.classList.remove('unveiling');
        }, delay);
      });

      if (!this.state.confettiTriggered && confettiLayer) {
        const hasGoodLoot = items.some(item => item.type === 'relic' || item.rarity === 'rare' || item.rarity === 'legendary');
        if (hasGoodLoot) {
          this.state.confettiTriggered = true;
          this.spawnConfetti(confettiLayer);
        }
      }
    };

    if (revealBtn) {
      revealBtn.onclick = reveal;
    }

    if (continueBtn && this.options.onContinue) {
      continueBtn.onclick = () => {
        hideTooltip();
        this.options.onContinue?.();
      };
    }

    if (autoReveal) {
      reveal();
    }

    hideTooltip();
  }

  private hideExtractTooltip(tooltip: HTMLElement | null): void {
    if (!tooltip) return;
    tooltip.innerHTML = '';
    tooltip.className = 'extract-tooltip';
    tooltip.style.display = 'none';
  }

  private positionExtractTooltip(tooltip: HTMLElement, event?: MouseEvent, anchor?: HTMLElement): void {
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let x = 12;
    let y = 12;

    if (event) {
      x = event.clientX + 12;
      y = event.clientY + 12;
    } else if (anchor) {
      const rect = anchor.getBoundingClientRect();
      x = rect.right + 12;
      y = rect.top + 8;
    }

    const maxX = window.innerWidth - width - 8;
    const maxY = window.innerHeight - height - 8;
    if (x > maxX) x = maxX;
    if (y > maxY) y = maxY;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  private showExtractTooltip(item: Item, tooltip: HTMLElement, event?: MouseEvent, anchor?: HTMLElement): void {
    tooltip.innerHTML = '';
    tooltip.className = 'extract-tooltip';
    if (item.type === 'relic') {
      tooltip.classList.add('tooltip-relic');
    } else {
      tooltip.classList.add(`tooltip-${item.rarity}`);
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

    const classLine = item.type === 'relic' && item.relicClassId
      ? (() => {
          const { CHARACTERS } = require('../../data/characters');
          const line = document.createElement('div');
          line.className = 'loadout-detail-base';
          line.textContent = `Class: ${CHARACTERS[item.relicClassId]?.name ?? item.relicClassId}`;
          return line;
        })()
      : null;

    const stats = document.createElement('div');
    stats.className = 'loadout-detail-stats';
    const hasRelicEffect = item.type === 'relic' && item.relicEffectDescription !== undefined && item.relicEffectDescription.length > 0;
    if (hasRelicEffect) {
      const effectTitle = document.createElement('div');
      effectTitle.className = 'affix-line implicit-line';
      effectTitle.textContent = `Unique: ${item.relicEffectName ?? 'Relic Effect'}`;
      stats.appendChild(effectTitle);
      item.relicEffectDescription?.forEach(desc => {
        const line = document.createElement('div');
        line.className = 'affix-line implicit-line';
        line.textContent = desc;
        stats.appendChild(line);
      });
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

    tooltip.appendChild(title);
    tooltip.appendChild(meta);
    tooltip.appendChild(base);
    if (classLine) tooltip.appendChild(classLine);
    tooltip.appendChild(stats);
    tooltip.style.display = 'block';
    this.positionExtractTooltip(tooltip, event, anchor);
  }

  private formatAffix(affix: Item['affixes'][0]): string {
    const { AFFIX_TIER_BRACKETS } = require('../../items/affixTables');
    const bracket = AFFIX_TIER_BRACKETS[affix.type]?.[affix.tier - 1];
    const sign = affix.value >= 0 ? '+' : '';
    const value = affix.isPercent ? `${affix.value}%` : `${affix.value}`;
    const bracketSuffix = bracket
      ? ` (${bracket.min}${affix.isPercent ? '%' : ''}-${bracket.max}${affix.isPercent ? '%' : ''})`
      : '';
    const label = this.AFFIX_LABELS[affix.type] ?? affix.type;
    return `T${affix.tier} ${sign}${value} ${label}${bracketSuffix}`;
  }

  private formatImplicit(affix: Item['implicits'][0]): string {
    const sign = affix.value >= 0 ? '+' : '';
    const value = affix.isPercent ? `${affix.value}%` : `${affix.value}`;
    const label = this.AFFIX_LABELS[affix.type] ?? affix.type;
    return `Implicit: ${sign}${value} ${label}`;
  }

  private spawnConfetti(confettiLayer: HTMLElement): void {
    confettiLayer.innerHTML = '';

    const colors = ['#fbbf24', '#f97316', '#60a5fa', '#a855f7', '#22c55e'];
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const size = 4 + Math.random() * 6;
      piece.style.width = `${size}px`;
      piece.style.height = `${size * 1.6}px`;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 0.3}s`;
      confettiLayer.appendChild(piece);
    }

    window.setTimeout(() => {
      confettiLayer.innerHTML = '';
    }, 2000);
  }

  destroy(): void {
    this.itemButtons = [];
    this.state = {
      revealed: false,
      confettiTriggered: false,
      activeTooltipId: null,
    };
  }
}
