import { CHARACTERS } from '../data/characters';
import { UPGRADES } from '../data/upgrades';
import { WEAPON_LEVELS, ATTRIBUTE_LABELS, UNIVERSAL_UPGRADES } from '../data/leveling';
import type { Item, ItemAffix } from '../items/types';
import { AFFIX_TIER_BRACKETS } from '../items/affixTables';
import { Utils } from '../utils';
import { wrapRelativePosition } from './movement';
import type { Weapon, ExtractionState } from '../types';

class UISystem {
  private cache: Record<string, HTMLElement | null> = {};

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
    const warningEl = this.getEl('extract-warning');
    const countdownEl = this.getEl('extract-countdown');
    const progressEl = this.getEl('extract-progress');
    const arrowEl = this.getEl('extract-arrow');

    const warningActive = state.warningEndTime > frames;
    if (warningEl) {
      if (warningActive) {
        const seconds = Math.max(0, Math.ceil((state.warningEndTime - frames) / 60));
        warningEl.textContent = `EXTRACT IN: ${seconds}s`;
        warningEl.style.display = 'block';
      } else {
        warningEl.style.display = 'none';
      }
    }

    const zone = state.currentZone && state.currentZone.active ? state.currentZone : null;
    if (countdownEl) {
      if (zone) {
        const seconds = Math.max(0, Math.ceil((zone.expiresAt - frames) / 60));
        countdownEl.textContent = `EXTRACT ZONE: ${seconds}s`;
        countdownEl.style.display = 'block';
      } else {
        countdownEl.style.display = 'none';
      }
    }

    if (progressEl) {
      if (zone && zone.inZone) {
        const progress = Math.min(100, Math.floor((zone.extractionProgress / (60 * 5)) * 100));
        progressEl.textContent = `EXTRACTING: ${progress}%`;
        progressEl.style.display = 'block';
      } else {
        progressEl.style.display = 'none';
      }
    }

    const target = state.pendingZone
      ? state.pendingZone
      : zone
        ? { x: zone.x, y: zone.y }
        : null;

    if (arrowEl) {
      if (target) {
        const dx = wrapRelativePosition(target.x - playerX);
        const dy = wrapRelativePosition(target.y - playerY);
        const onScreen = Math.abs(dx) < window.innerWidth / 2 - 140 &&
          Math.abs(dy) < window.innerHeight / 2 - 140;

        if (!onScreen) {
          const angle = Math.atan2(dy, dx);
          const radius = Math.min(window.innerWidth, window.innerHeight) / 2 - 40;
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;

          arrowEl.style.left = `${centerX + Math.cos(angle) * radius}px`;
          arrowEl.style.top = `${centerY + Math.sin(angle) * radius}px`;
          arrowEl.style.transform = `translate(-50%, -50%) rotate(${angle + Math.PI / 2}rad)`;
          arrowEl.style.display = 'block';
        } else {
          arrowEl.style.display = 'none';
        }
      } else {
        arrowEl.style.display = 'none';
      }
    }
  }

  hideExtractionHud(): void {
    const warningEl = this.getEl('extract-warning');
    const countdownEl = this.getEl('extract-countdown');
    const progressEl = this.getEl('extract-progress');
    const arrowEl = this.getEl('extract-arrow');

    if (warningEl) warningEl.style.display = 'none';
    if (countdownEl) countdownEl.style.display = 'none';
    if (progressEl) progressEl.style.display = 'none';
    if (arrowEl) arrowEl.style.display = 'none';
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
      html += `<span class="loot-rarity-tag rarity-${rarity}">${rarityIcons[rarity]}${counts[rarity]}</span> `;
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
    _wx: number,
    _wy: number,
    txt: string | number,
    color = '#fff',
    isCrit = false
  ): HTMLElement | null {
    const el = document.createElement('div');
    el.className = 'dmg-text ' + (isCrit ? 'crit-text' : '');
    if (color === '#f00') el.classList.add('player-hit');
    el.textContent = txt.toString() + (isCrit ? '!' : '');
    el.style.color = color;

    const layer = this.getEl('damage-layer');
    if (layer) {
      layer.appendChild(el);
      return el;
    }

    return null;
  }

  updateDamageTexts(
    texts: Array<{ el: HTMLElement; wx: number; wy: number; life: number }>,
    px: number,
    py: number,
    _frames: number
  ): void {
    texts.forEach(t => {
      t.life--;
      t.el.style.opacity = (t.life / 20).toString();

      let rx = t.wx - px;
      let ry = t.wy - py;

      // World wrapping for text
      const worldSize = 2000;
      if (rx < -worldSize / 2) rx += worldSize;
      if (rx > worldSize / 2) rx -= worldSize;
      if (ry < -worldSize / 2) ry += worldSize;
      if (ry > worldSize / 2) ry -= worldSize;

      const scale = t.el.classList.contains('crit-text') ? 1.5 : 1;
      // Position text above sprites - use larger offset to clear enemy sprites
      t.el.style.transform = `translate(${rx + window.innerWidth / 2}px, ${ry + window.innerHeight / 2 - (80 - t.life)}px) scale(${scale})`;
    });
  }

  showGameOverScreen(
    success: boolean,
    goldRun: number,
    mins: number,
    kills: number,
    bossKills: number
  ): void {
    const survivalBonus = Math.floor(goldRun * (mins * 0.2));
    const killBonus = Math.floor(kills / 100) * 50;
    const bossBonus = bossKills * 200;
    const total = goldRun + survivalBonus + killBonus + bossBonus;

    const title = success ? 'MISSION COMPLETE' : 'MIA - FAILED';
    const color = success ? '#22c55e' : '#ff3333';

    const titleEl = this.getEl('go-title');
    const statsEl = this.getEl('go-stats');

    if (titleEl) {
      titleEl.textContent = title;
      titleEl.style.color = color;
    }

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="score-row"><span>Base Loot:</span> <span class="score-val">${goldRun}</span></div>
        <div class="score-row"><span>Time Bonus:</span> <span class="score-val">+${survivalBonus}</span></div>
        <div class="score-row"><span>Kill Bonus:</span> <span class="score-val">+${killBonus}</span></div>
        <div class="score-row"><span>Boss Bounties:</span> <span class="score-val">+${bossBonus}</span></div>
        <div class="score-row total-row"><span>TOTAL:</span> <span>${total} G</span></div>
      `;
    }

    const screen = this.getEl('gameover-screen');
    if (screen) screen.classList.add('active');
  }

  showExtractionScreen(items: Item[], onContinue: () => void): void {
    const screen = this.getEl('extract-screen');
    const grid = this.getEl('extract-grid');
    const revealBtn = this.getEl('extract-reveal-btn') as HTMLButtonElement | null;
    const continueBtn = this.getEl('extract-continue-btn') as HTMLButtonElement | null;
    const tooltip = this.getEl('extract-tooltip');

    if (screen) screen.classList.add('active');
    if (!grid || !revealBtn || !continueBtn) return;

    let revealed = false;
    let confettiTriggered = false;

    const formatAffix = (affix: ItemAffix): string => {
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
    };

    const formatImplicit = (affix: ItemAffix): string => {
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
    };

    const hideTooltip = (): void => {
      if (!tooltip) return;
      tooltip.innerHTML = '';
      tooltip.className = 'extract-tooltip';
      tooltip.style.display = 'none';
    };

    const showTooltip = (item: Item, event?: MouseEvent): void => {
      if (!tooltip) return;
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

      const stats = document.createElement('div');
      stats.className = 'loadout-detail-stats';
      const implicits = item.implicits ?? [];
      if (implicits.length > 0) {
        implicits.forEach(affix => {
          const line = document.createElement('div');
          line.className = 'affix-line implicit-line';
          line.textContent = formatImplicit(affix);
          stats.appendChild(line);
        });
      }
      if (item.affixes.length > 0) {
        item.affixes.forEach(affix => {
          const line = document.createElement('div');
          line.className = `affix-line tier-${affix.tier}`;
          line.textContent = formatAffix(affix);
          stats.appendChild(line);
        });
      } else if (implicits.length === 0) {
        stats.textContent = 'No affixes.';
      }

      tooltip.appendChild(title);
      tooltip.appendChild(meta);
      tooltip.appendChild(base);
      tooltip.appendChild(stats);
      tooltip.style.display = 'block';

      if (event) {
        const width = tooltip.offsetWidth;
        const height = tooltip.offsetHeight;
        let x = event.clientX + 12;
        let y = event.clientY + 12;
        const maxX = window.innerWidth - width - 8;
        const maxY = window.innerHeight - height - 8;
        if (x > maxX) x = maxX;
        if (y > maxY) y = maxY;
        if (x < 8) x = 8;
        if (y < 8) y = 8;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
      }
    };

    grid.innerHTML = '';
    grid.classList.remove('revealing');

    const itemButtons: HTMLButtonElement[] = [];
    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = `extract-item rarity-${item.rarity} ${item.type === 'relic' ? 'type-relic' : ''}`;
      button.textContent = 'VEILED';

      button.onmouseenter = (event) => {
        if (!revealed) return;
        showTooltip(item, event);
      };
      button.onmousemove = (event) => {
        if (!revealed) return;
        showTooltip(item, event);
      };
      button.onmouseleave = () => hideTooltip();
      button.onfocus = () => {
        if (!revealed) return;
        showTooltip(item);
      };
      button.onblur = () => hideTooltip();

      grid.appendChild(button);
      itemButtons[index] = button;
    });

    continueBtn.disabled = true;
    continueBtn.classList.add('btn-disabled');
    revealBtn.disabled = false;
    revealBtn.classList.remove('btn-disabled');

    const spawnConfetti = (): void => {
      const confettiLayer = this.getEl('extract-confetti');
      if (!confettiLayer) return;
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
    };

    revealBtn.onclick = () => {
      if (revealed) return;
      revealed = true;
      hideTooltip();
      continueBtn.disabled = false;
      continueBtn.classList.remove('btn-disabled');
      revealBtn.disabled = true;
      revealBtn.classList.add('btn-disabled');
      grid.classList.add('revealing');

      itemButtons.forEach((button, index) => {
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

      if (!confettiTriggered) {
        const hasGoodLoot = items.some(item => item.type === 'relic' || item.rarity === 'rare' || item.rarity === 'legendary');
        if (hasGoodLoot) {
          confettiTriggered = true;
          spawnConfetti();
        }
      }
    };

    continueBtn.onclick = () => {
      this.hideExtractionScreen();
      onContinue();
    };

    hideTooltip();
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
    const container = this.getEl('card-container');
    if (!container) return;

    container.innerHTML = '';

    choices.forEach(id => {
      const def = UPGRADES[id];
      if (!def) return;

      const lvl = inventory[id] || 0;
      const el = document.createElement('div');
      el.className = 'level-card level-card-anim';

      // Build detailed stats display
      let statsHtml = '';
      if (def.type === 'Weapon') {
        const isNew = lvl === 0;
        if (def.dmg !== undefined) {
          if (isNew) {
            statsHtml = `<div style="color:#4ade80">⚔ ${def.dmg} DMG</div>`;
          } else {
            const currentDmg = def.dmg * Math.pow(1.3, lvl);
            const nextDmg = def.dmg * Math.pow(1.3, lvl + 1);
            statsHtml = `<div style="color:#4ade80">⚔ ${Math.round(currentDmg)} → ${Math.round(nextDmg)} DMG</div>`;
          }
        }
        if (def.cd !== undefined) {
          const cdSec = Math.round(def.cd / 10) / 10;
          if (isNew) {
            statsHtml += `<div style="color:#60a5fa">⏱ ${cdSec}s CD</div>`;
          } else {
            const currentCd = def.cd * Math.pow(0.9, lvl);
            const nextCd = def.cd * Math.pow(0.9, lvl + 1);
            const currentCdSec = Math.round(currentCd / 10) / 10;
            const nextCdSec = Math.round(nextCd / 10) / 10;
            statsHtml += `<div style="color:#60a5fa">⏱ ${currentCdSec}s → ${nextCdSec}s CD</div>`;
          }
        }
        if (def.area !== undefined) {
          if (isNew) {
            statsHtml += `<div style="color:#f472b6">◎ ${def.area} Area</div>`;
          } else {
            const currentArea = def.area + (lvl * 15);
            const nextArea = def.area + ((lvl + 1) * 15);
            statsHtml += `<div style="color:#f472b6">◎ ${currentArea} → ${nextArea} Area</div>`;
          }
        }
      } else {
        // Items
        if (def.pierce !== undefined) {
          const current = currentStats.items.pierce;
          statsHtml = `<div style="color:#4ade80">Pierce: ${current} → ${current + def.pierce}</div>`;
        }
        if (def.projectileCount !== undefined) {
          const current = currentStats.items.projectile;
          statsHtml = `<div style="color:#f472b6">Projectile: +${current} → +${current + def.projectileCount}</div>`;
        }
        if (def.crit !== undefined) {
          const current = Math.round(currentStats.critChance * 100);
          statsHtml = `<div style="color:#fbbf24">Crit: ${current}% → ${current + def.crit}%</div>`;
        }
        if (def.damageMult !== undefined) {
          const current = Math.round((currentStats.dmgMult - 1) * 100);
          const next = current + Math.round(def.damageMult * 100);
          statsHtml = `<div style="color:#ef4444">Damage: +${current}% → +${next}%</div>`;
        }
        if (def.cooldownMult !== undefined) {
          const current = Math.round(currentStats.items.cooldown * 100);
          const next = current + Math.round(def.cooldownMult * 100);
          statsHtml = `<div style="color:#60a5fa">Atk Spd: +${current}% → +${next}%</div>`;
        }
      }

      el.innerHTML = `
        <div class="card-type">${def.type}</div>
        <div style="color:var(--gold)">${def.name}</div>
        <div style="font-size:10px">${lvl === 0 ? '✨ NEW!' : '⬆ Lvl ' + lvl + ' → ' + (lvl + 1)}</div>
        <div style="font-size:9px;color:#aaa;margin:2px 0">${def.desc}</div>
        <div style="margin-top:8px;font-size:8px;line-height:1.4">${statsHtml}</div>
      `;
      el.onclick = () => {
        onSelect(id);
        const screen = this.getEl('levelup-screen');
        if (screen) screen.classList.remove('active');
      };
      container.appendChild(el);
    });

    const screen = this.getEl('levelup-screen');
    if (screen) screen.classList.add('active');
  }

  // Map weapon IDs to icon image paths
  private weaponIconMap: Record<string, string> = {
    bubble_stream: '/bubble_stream.png',
    frying_pan: '/frying_pan.png',
    thrown_cds: '/thrown_cds.png',
    fireball: '/fireball.png',
    lighter: '/lighter.png',
    shield_bash: '/shield_bash.png',
    bow: '/weapons/arrow.png',
  };

  // Fallback emoji icons for weapons without image sprites
  private weaponEmojiMap: Record<string, string> = {
    bubble_stream: '🫧',
    frying_pan: '🍳',
    thrown_cds: '💿',
    fireball: '🔥',
    lighter: '🔥',
    shield_bash: '🛡️',
    bow: '🏹',
  };

  updateWeaponSlots(weapons: Weapon[]): void {
    const container = this.getEl('weapon-slots');
    if (!container) return;

    // Only rebuild if weapon count changed (optimization)
    const currentSlots = container.querySelectorAll('.weapon-slot').length;
    if (currentSlots !== weapons.length) {
      container.innerHTML = '';
      weapons.forEach(w => {
        const slot = document.createElement('div');
        slot.className = 'weapon-slot';
        slot.dataset.weaponId = w.id;

        const icon = document.createElement('img');
        icon.className = 'weapon-icon';
        // Check if we have an image sprite for this weapon
        if (this.weaponIconMap[w.id]) {
          icon.src = this.weaponIconMap[w.id];
          icon.onerror = () => {
            // Fallback to emoji if image fails to load
            icon.style.display = 'none';
            const emoji = document.createElement('span');
            emoji.className = 'weapon-icon';
            emoji.style.fontSize = '16px';
            emoji.textContent = this.weaponEmojiMap[w.id] || '⚔️';
            icon.parentElement?.insertBefore(emoji, icon);
          };
        } else {
          // Use emoji directly
          icon.style.display = 'none';
          const emoji = document.createElement('span');
          emoji.className = 'weapon-icon';
          emoji.style.fontSize = '16px';
          emoji.textContent = this.weaponEmojiMap[w.id] || '⚔️';
          slot.appendChild(emoji);
        }

        const level = document.createElement('span');
        level.className = 'weapon-level';
        level.textContent = `Lv${w.level}`;

        const name = document.createElement('span');
        name.className = 'weapon-name';
        const upgrade = UPGRADES[w.id];
        name.textContent = upgrade ? upgrade.name.replace(/[A-Z]/g, m => ' ' + m).trim() : w.id;

        const infoBtn = document.createElement('div');
        infoBtn.className = 'info-btn';
        infoBtn.textContent = 'i';
        infoBtn.title = 'View Level Path';
        infoBtn.onclick = (e) => {
          e.stopPropagation();
          this.showLevelInfo(w.id);
        };

        slot.appendChild(icon);
        slot.appendChild(level);
        slot.appendChild(name);
        slot.appendChild(infoBtn);
        container.appendChild(slot);
      });
    }

    // Update cooldown ready state, level, and tooltip handlers
    weapons.forEach((w, i) => {
      const slot = container.querySelectorAll('.weapon-slot')[i] as HTMLElement;
      if (slot) {
        if (w.curCd <= 0) {
          slot.classList.add('cooldown-ready');
        } else {
          slot.classList.remove('cooldown-ready');
        }
        const level = slot.querySelector('.weapon-level');
        if (level) {
          level.textContent = `Lv${w.level}`;
        }

        slot.onmouseenter = (event: MouseEvent) => this.showWeaponTooltip(w, event);
        slot.onmousemove = (event: MouseEvent) => {
          const tooltip = this.getEl('weapon-tooltip');
          if (tooltip && tooltip.style.display !== 'none') {
            this.showWeaponTooltip(w, event);
          }
        };
        slot.onmouseleave = () => this.hideWeaponTooltip();
      }
    });
    weapons.forEach((w, i) => {
      const slot = container.querySelectorAll('.weapon-slot')[i];
      if (slot) {
        if (w.curCd <= 0) {
          slot.classList.add('cooldown-ready');
        } else {
          slot.classList.remove('cooldown-ready');
        }
        const level = slot.querySelector('.weapon-level');
        if (level) {
          level.textContent = `Lv${w.level}`;
        }
      }
    });
  }

  showWeaponTooltip(weapon: Weapon, event?: MouseEvent): void {
    const tooltip = this.getEl('weapon-tooltip');
    if (!tooltip) return;
    tooltip.innerHTML = '';
    tooltip.className = 'weapon-tooltip';

    const upgrade = UPGRADES[weapon.id];
    const name = upgrade ? upgrade.name.replace(/[A-Z]/g, m => ' ' + m).trim() : weapon.id;

    const title = document.createElement('div');
    title.className = 'weapon-tooltip-title';
    title.textContent = `${name} (Lv${weapon.level})`;

    const desc = document.createElement('div');
    desc.className = 'weapon-tooltip-desc';
    desc.textContent = upgrade?.desc || '';

    const stats = document.createElement('div');
    stats.className = 'weapon-tooltip-stats';

    const dmgMult = this.player?.dmgMult ?? 0;
    const dmg = weapon.dmg * (1 + dmgMult);
    const dmgLine = document.createElement('div');
    dmgLine.textContent = `Damage: ${dmg.toFixed(1)}`;
    stats.appendChild(dmgLine);

    const cdLine = document.createElement('div');
    cdLine.textContent = `Cooldown: ${(weapon.cd / 60).toFixed(1)}s`;
    stats.appendChild(cdLine);

    if (weapon.projectileCount) {
      const projLine = document.createElement('div');
      projLine.textContent = `Projectiles: ${weapon.projectileCount}`;
      stats.appendChild(projLine);
    }

    if (weapon.speedMult) {
      const speedLine = document.createElement('div');
      speedLine.textContent = `Speed: ${(weapon.speedMult * 100).toFixed(0)}%`;
      stats.appendChild(speedLine);
    }

    if (weapon.splits) {
      const splitLine = document.createElement('div');
      splitLine.textContent = `Splits on hit`;
      stats.appendChild(splitLine);
    }

    if (weapon.explodeRadius) {
      const explodeLine = document.createElement('div');
      explodeLine.textContent = `Explosion: ${weapon.explodeRadius}px`;
      stats.appendChild(explodeLine);
    }

    if (weapon.knockback) {
      const kbLine = document.createElement('div');
      kbLine.textContent = `Knockback: ${weapon.knockback}`;
      stats.appendChild(kbLine);
    }

    if (weapon.area) {
      const areaLine = document.createElement('div');
      areaLine.textContent = `Area: ${weapon.area}px`;
      stats.appendChild(areaLine);
    }

    if (weapon.coneLength) {
      const coneLine = document.createElement('div');
      coneLine.textContent = `Range: ${weapon.coneLength}px`;
      stats.appendChild(coneLine);
    }

    if (weapon.coneWidth) {
      const widthLine = document.createElement('div');
      widthLine.textContent = `Cone: ${(weapon.coneWidth * 180 / Math.PI).toFixed(0)}°`;
      stats.appendChild(widthLine);
    }

    if (weapon.trailDamage) {
      const trailLine = document.createElement('div');
      trailLine.textContent = `Trail Dmg: ${weapon.trailDamage}`;
      stats.appendChild(trailLine);
    }

    tooltip.appendChild(title);
    tooltip.appendChild(desc);
    tooltip.appendChild(stats);
    tooltip.style.display = 'block';

    if (event) {
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      let x = event.clientX + 12;
      let y = event.clientY + 12;
      const maxX = window.innerWidth - width - 8;
      const maxY = window.innerHeight - height - 8;
      if (x > maxX) x = maxX;
      if (y > maxY) y = maxY;
      if (x < 8) x = 8;
      if (y < 8) y = 8;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    }
  }

  hideWeaponTooltip(): void {
    const tooltip = this.getEl('weapon-tooltip');
    if (tooltip) {
      tooltip.innerHTML = '';
      tooltip.style.display = 'none';
    }
  }

  showLevelInfo(weaponId: string): void {
    const popup = this.getEl('level-info-popup');
    const backdrop = this.getEl('level-info-backdrop');
    if (!popup || !backdrop) return;

    const upgrade = UPGRADES[weaponId];
    const levels = WEAPON_LEVELS[weaponId];
    if (!upgrade) return;

    const name = upgrade.name.replace(/[A-Z]/g, m => ' ' + m).trim();
    let currentLevel = 1;

    // Map weapon ID to pretty projectile name
    const PROJ_NAMES: Record<string, string> = {
      'bow': 'Arrow',
      'thrown_cds': 'Disk',
      'fireball': 'Fireball',
      'bubble_stream': 'Bubble',
      'frying_pan': 'Pan',
      'lighter': 'Flame',
      'shield_bash': 'Bash'
    };
    const projName = PROJ_NAMES[weaponId] || 'Projectile';

    // Find current level from game state
    const w = (window as any).Game?.player?.weapons.find((w: any) => w.id === weaponId);
    if (w) currentLevel = w.level;

    let html = `
      <div class="level-info-title">${name}</div>
      <div class="level-info-desc">${upgrade.desc}</div>
      <div class="level-list">
    `;

    // Simulate weapon growth for cumulative stats
    const getWeaponState = (level: number) => {
      const state: any = {
        level: 1,
        baseDmg: upgrade.dmg || 0,
        cd: upgrade.cd || 0,
        projectileCount: upgrade.projectileCount || 1,
        bounces: upgrade.bounces || 0,
        pierce: upgrade.pierce || 0,
        speedMult: 1.0,
        explodeRadius: upgrade.explodeRadius || 0,
        knockback: upgrade.knockback || 0,
        size: upgrade.size || 0,
        splits: upgrade.splits || false,
        trailDamage: upgrade.trailDamage || 0,
        coneLength: upgrade.coneLength || 0,
        coneWidth: upgrade.coneWidth || 0,
        spread: upgrade.spread || 0
      };

      for (let i = 2; i <= level; i++) {
        state.level = i;
        state.baseDmg *= UNIVERSAL_UPGRADES.dmg;
        state.cd *= UNIVERSAL_UPGRADES.cd;
        if (state.type === 'aura' && state.area) state.area += UNIVERSAL_UPGRADES.auraArea;
        const bonus = levels ? levels[i] : null;
        if (bonus) {
          Object.assign(state, bonus);
        }
      }
      return state;
    };

    const renderStat = (label: string, value: string | number, highlight: boolean = false) => `
      <div class="level-stat-line">
        <span class="level-stat-label">${label}:</span>
        <span class="level-stat-value ${highlight ? 'highlight' : ''}">${value}</span>
      </div>
    `;

    for (let i = 1; i <= 5; i++) {
      const state = getWeaponState(i);
      const prevState = i > 1 ? getWeaponState(i - 1) : null;
      const isCurrent = currentLevel === i;

      // Generate "NEW" bonus lines by comparing current state to previous state
      const dynamicBonuses: string[] = [];
      if (prevState) {
        const dmgPct = Math.round((UNIVERSAL_UPGRADES.dmg - 1) * 100);
        const cdPct = Math.round((1 - UNIVERSAL_UPGRADES.cd) * 100);
        dynamicBonuses.push(`+${dmgPct}% Damage`);
        dynamicBonuses.push(`-${cdPct}% Cooldown`);

        // Dynamically detect changes based on ATTRIBUTE_LABELS
        for (const [attr, label] of Object.entries(ATTRIBUTE_LABELS)) {
          const val = (state as any)[attr];
          const prevVal = (prevState as any)[attr];

          if (val !== prevVal && val !== undefined) {
            if (typeof val === 'number' && typeof prevVal === 'number') {
              const diff = val - prevVal;
              if (attr === 'speedMult') {
                const pct = Math.round((val / prevVal - 1) * 100);
                dynamicBonuses.push(`+${pct}% ${label}`);
              } else if (attr === 'projectileCount') {
                dynamicBonuses.push(`+${diff} ${projName}${diff > 1 ? 's' : ''}`);
              } else {
                dynamicBonuses.push(`+${diff} ${label}`);
              }
            } else if (typeof val === 'boolean' && val === true && !prevVal) {
              dynamicBonuses.push(label);
            }
          }
        }
      }

      html += `
        <div class="level-row ${isCurrent ? 'current' : ''}">
          <div class="level-num">Level ${i}${isCurrent ? ' (Current)' : ''}</div>
          <div class="level-details">
            ${renderStat('Dmg', Math.round(state.baseDmg), true)}
            ${renderStat('CD', (state.cd / 60).toFixed(2) + 's', true)}
            ${state.projectileCount > 1 ? renderStat('Projectiles', state.projectileCount) : ''}
            ${state.pierce > 0 ? renderStat('Pierce', state.pierce) : ''}
            ${state.bounces > 0 ? renderStat('Bounces', state.bounces) : ''}
            ${state.explodeRadius > 0 ? renderStat('Aoe', state.explodeRadius + 'px') : ''}
            ${state.splits ? renderStat('Splits', 'YES') : ''}
            ${state.trailDamage > 0 ? renderStat('Trail Dmg', state.trailDamage) : ''}
            
            ${dynamicBonuses.length > 0 ? `
              <div class="new-bonus-section">
                ${dynamicBonuses.map(line => `
                  <div class="new-bonus-line">
                    <span class="new-bonus-tag">NEW</span>
                    <span>${line}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    html += `
      </div>
      <button class="info-popup-close" onclick="UI.hideLevelInfo()">CLOSE</button>
    `;

    popup.innerHTML = html;
    popup.classList.add('active');
    backdrop.classList.add('active');
  }

  hideLevelInfo(): void {
    const popup = this.getEl('level-info-popup');
    const backdrop = this.getEl('level-info-backdrop');
    if (popup) popup.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
  }

  private player: { dmgMult: number; weapons: any[] } | null = null;
  setPlayer(player: { dmgMult: number; weapons: any[] }): void {
    this.player = player;
  }
}

export const UI = new UISystem();
(window as any).UI = UI;
