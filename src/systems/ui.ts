import { CHARACTERS } from '../data/characters';
import type { Item } from '../items/types';
import { Utils } from '../utils';
import type { Weapon, ExtractionState } from '../types';
import { LootRevealSystem } from './ui/LootRevealSystem';
import { DamageTextSystem } from './ui/DamageTextSystem';
import { ExtractionHudSystem } from './ui/ExtractionHudSystem';
import { LevelUpSystem } from './ui/LevelUpSystem';
import { WeaponSlotsSystem } from './ui/WeaponSlotsSystem';
import { GameOverScreenSystem } from './ui/GameOverScreenSystem';
import { LevelInfoSystem } from './ui/LevelInfoSystem';

class UISystem {
  private cache: Record<string, HTMLElement | null> = {};
  private damageTextSystem = new DamageTextSystem();
  private extractionHudSystem = new ExtractionHudSystem();
  private levelUpSystem = new LevelUpSystem();
  private weaponSlotsSystem = new WeaponSlotsSystem();
  private gameOverScreenSystem = new GameOverScreenSystem();
  private levelInfoSystem = new LevelInfoSystem();

  private getEl(id: string): HTMLElement | null {
    if (!(id in this.cache)) {
      this.cache[id] = document.getElementById(id);
    }
    return this.cache[id];
  }

  updateHud(
    gold: number,
    time: number,
    level: number,
    kills: number,
    selectedChar: string,
    particles: number = 0,
    enemies: number = 0
  ): void {
    const goldEl = this.getEl('hud-gold');
    const timerEl = this.getEl('hud-timer');
    const levelEl = this.getEl('hud-level');
    const killsEl = this.getEl('hud-kills');
    const charEl = this.getEl('hud-char');
    const particlesEl = this.getEl('hud-particles');
    const enemiesEl = this.getEl('hud-enemies');

    if (goldEl) goldEl.textContent = `💰 ${gold}`;
    if (timerEl) timerEl.textContent = Utils.fmtTime(time);
    if (levelEl) levelEl.textContent = level.toString();
    if (killsEl) killsEl.textContent = kills.toString();
    if (particlesEl) particlesEl.textContent = particles.toString();
    if (enemiesEl) enemiesEl.textContent = enemies.toString();
    if (charEl) {
      const char = CHARACTERS[selectedChar];
      if (char) charEl.textContent = char.name;
    }
  }

  updateExtractionHud(state: ExtractionState, playerX: number, playerY: number, frames: number): void {
    this.extractionHudSystem.updateExtractionHud(state, playerX, playerY, frames);
  }

  hideExtractionHud(): void {
    this.extractionHudSystem.hideExtractionHud();
  }

  updateLootSummaryHud(items: Item[]): void {
    const el = this.getEl('hud-loot-summary');
    if (!el) return;

    const counts: Record<string, number> = {
      legendary: 0,
      relic: 0,
      rare: 0,
      magic: 0,
      common: 0
    };

    items.forEach(item => {
      if (counts[item.rarity] !== undefined) counts[item.rarity]++;
    });

    const rarityOrder = ['legendary', 'relic', 'rare', 'magic', 'common'];
    const rarityIcons: Record<string, string> = {
      legendary: '★',
      relic: '★',
      rare: '★',
      magic: '★',
      common: '★'
    };

    let html = '<span style="color:#aaa;margin-right:2px">LOOT:</span>';
    rarityOrder.forEach(rarity => {
      html += `<span class="loot-rarity-tag rarity-${rarity}"><span class="star-icon">${rarityIcons[rarity]}</span>${counts[rarity]}</span> `;
    });
    el.innerHTML = html;
  }

  updateXp(current: number, max: number, level: number): void {
    const xpBar = this.getEl('xp-bar-fill');
    const levelEl = this.getEl('hud-level');

    if (xpBar) xpBar.style.width = `${(current / max) * 100}%`;
    if (levelEl) levelEl.textContent = level.toString();
  }

  updateUlt(current: number, max: number): void {
    const pct = Math.min(1, current / max);
    const btn = this.getEl('ult-btn');
    const overlay = this.getEl('ult-cooldown-overlay');

    if (overlay) overlay.style.height = `${100 - pct * 100}%`;
    if (btn) {
      if (pct >= 1) btn.classList.add('ready');
      else btn.classList.remove('ready');
    }
  }

  updateVeiledCount(count: number): void {
    const veiledEl = this.getEl('hud-veiled');
    if (veiledEl) veiledEl.textContent = `Veiled: ${count}`;
  }

  updateItemSlots(_items: { pierce: number; cooldown: number; projectile: number }, inventory: Record<string, number>): void {
    const itemConfig = [
      { id: 'pierce', key: 'pierce' },
      { id: 'projectile', key: 'projectile' },
      { id: 'cooldown', key: 'cooldown' },
      { id: 'scope', key: 'scope' },
      { id: 'damage', key: 'damage' }
    ];

    itemConfig.forEach(config => {
      const slot = document.querySelector(`.item-slot[data-item="${config.id}"]`);
      if (slot) {
        const count = inventory[config.id] || 0;
        const countEl = slot.querySelector('.item-count');
        if (countEl) countEl.textContent = count.toString();

        if (count > 0) {
          slot.classList.add('active');
        } else {
          slot.classList.remove('active');
        }
      }
    });
  }

  spawnDamageText(
    wx: number,
    wy: number,
    txt: string | number,
    color = '#fff',
    isCrit = false
  ): HTMLElement | null {
    return this.damageTextSystem.spawnDamageText(wx, wy, txt, color, isCrit);
  }

  updateDamageTexts(
    texts: Array<{ el: HTMLElement; wx: number; wy: number; life: number }>,
    px: number,
    py: number,
    _frames: number
  ): void {
    this.damageTextSystem.updateDamageTexts(texts, px, py);
  }

  showGameOverScreen(
    success: boolean,
    goldRun: number,
    mins: number,
    kills: number,
    bossKills: number,
    securedItems: Item[] = []
  ): void {
    this.gameOverScreenSystem.showGameOverScreen(success, goldRun, mins, kills, bossKills, securedItems);
  }

  hideGameOverScreen(): void {
    this.gameOverScreenSystem.hideGameOverScreen();
  }

  showExtractionScreen(items: Item[], onContinue: () => void): void {
    const screen = this.getEl('extract-screen');
    const grid = this.getEl('extract-grid');
    const revealBtn = this.getEl('extract-reveal-btn') as HTMLButtonElement | null;
    const continueBtn = this.getEl('extract-continue-btn') as HTMLButtonElement | null;
    const tooltip = this.getEl('extract-tooltip');
    const confettiLayer = this.getEl('extract-confetti');

    if (screen) screen.classList.add('active');
    if (!grid) return;

    new LootRevealSystem({
      items,
      grid,
      tooltip,
      revealBtn,
      continueBtn: continueBtn ?? undefined,
      onContinue: () => {
        this.hideExtractionScreen();
        onContinue();
      },
      confettiLayer: confettiLayer ?? undefined,
    });
  }

  hideExtractionScreen(): void {
    const screen = this.getEl('extract-screen');
    const tooltip = this.getEl('extract-tooltip');
    if (screen) screen.classList.remove('active');
    if (tooltip) {
      tooltip.innerHTML = '';
      tooltip.style.display = 'none';
    }
  }

  showLootInventory(items: Item[], safeSlotCount: number): void {
    const screen = this.getEl('loot-inventory-screen');
    const grid = this.getEl('loot-inventory-grid');
    const securedEl = this.getEl('loot-secure-slot');
    if (screen) screen.classList.add('active');
    if (securedEl) {
      const itemsWillSecure = Math.min(items.length, safeSlotCount);
      securedEl.textContent = `Auto-Safe Slots: ${itemsWillSecure}/${safeSlotCount}`;
    }

    if (!grid) return;
    grid.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'loot-empty';
      empty.textContent = 'No loot collected.';
      grid.appendChild(empty);
      return;
    }

    const typeIcon = (type: string): string => {
      switch (type) {
        case 'weapon':
          return '🗡';
        case 'helm':
          return '🪖';
        case 'armor':
          return '🛡';
        case 'accessory':
          return '💍';
        case 'relic':
          return '⭐';
        default:
          return '❔';
      }
    };

    items.forEach(item => {
      const button = document.createElement('button');
      button.className = `loot-item rarity-${item.rarity} ${item.type === 'relic' ? 'type-relic' : ''}`;
      button.innerHTML = `
        ${item.type === 'relic' ? '<span class="loot-badge">★</span>' : ''}
        <span class="loot-icon">${typeIcon(item.type)}</span>
        <span class="loot-name">${item.rarity.toUpperCase()} ${item.type.toUpperCase()}</span>
        <span class="loot-meta">VEILED</span>
      `;
      grid.appendChild(button);
    });
  }

  hideLootInventory(): void {
    const screen = this.getEl('loot-inventory-screen');
    if (screen) screen.classList.remove('active');
  }

  showLevelUpScreen(
    choices: string[],
    inventory: Record<string, number>,
    currentStats: {
      items: { pierce: number; cooldown: number; projectile: number };
      critChance: number;
      dmgMult: number;
    },
    onSelect: (id: string) => void
  ): void {
    this.levelUpSystem.showLevelUpScreen(choices, inventory, currentStats, onSelect);
  }

  updateWeaponSlots(weapons: Weapon[]): void {
    this.weaponSlotsSystem.updateWeaponSlots(weapons, (weaponId) => this.showLevelInfo(weaponId));
  }

  showWeaponTooltip(weapon: Weapon, event?: MouseEvent): void {
    this.weaponSlotsSystem.showWeaponTooltip(weapon, event);
  }

  hideWeaponTooltip(): void {
    this.weaponSlotsSystem.hideWeaponTooltip();
  }

  showLevelInfo(weaponId: string, classId?: string): void {
    this.levelInfoSystem.showLevelInfo(weaponId, classId);
  }

  hideLevelInfo(): void {
    this.levelInfoSystem.hideLevelInfo();
  }

  setPlayer(player: { dmgMult: number; weapons: any[] }): void {
    this.weaponSlotsSystem.setPlayer(player);
  }
}

export const UI = new UISystem();
(window as any).UI = UI;
