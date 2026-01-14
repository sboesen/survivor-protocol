import { CHARACTERS } from '../data/characters';
import { UPGRADES } from '../data/upgrades';
import { WEAPON_LEVELS, ATTRIBUTE_LABELS, UNIVERSAL_UPGRADES } from '../data/leveling';
import { getRelicsForClass } from '../data/relics';
import type { AffixDefinition, Item } from '../items/types';
import { AFFIX_POOLS, UNIVERSAL_AFFIXES } from '../items/affixTables';
import { Utils } from '../utils';
import type { Weapon, ExtractionState } from '../types';
import { LootRevealSystem } from './ui/LootRevealSystem';
import { DamageTextSystem } from './ui/DamageTextSystem';
import { ExtractionHudSystem } from './ui/ExtractionHudSystem';
import { LevelUpSystem } from './ui/LevelUpSystem';

class UISystem {
  private cache: Record<string, HTMLElement | null> = {};
  private damageTextSystem = new DamageTextSystem();
  private extractionHudSystem = new ExtractionHudSystem();
  private levelUpSystem = new LevelUpSystem();

  private getEl(id: string): HTMLElement | null {
    if (!(id in this.cache)) {
      this.cache[id] = document.getElementById(id);
    }
    return this.cache[id];
  }

  private formatAffixPoolRange(definition: AffixDefinition): string {
    const AFFIX_LABELS: Record<string, string> = {
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
    const label = AFFIX_LABELS[definition.type] ?? definition.type;
    const values = definition.tiers.filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return label;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const suffix = definition.isPercent ? '%' : '';
    if (min === max) {
      return `${label}: +${min}${suffix}`;
    }
    return `${label}: +${min}${suffix}–${max}${suffix}`;
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

    const lootSection = this.getEl('go-loot');
    const lootGrid = this.getEl('go-loot-grid');
    const revealBtn = this.getEl('go-reveal-btn') as HTMLButtonElement | null;
    const tooltip = this.getEl('extract-tooltip');

    if (!success && lootSection && lootGrid) {
      if (securedItems.length > 0) {
        lootSection.classList.add('active');
        new LootRevealSystem({
          items: securedItems,
          grid: lootGrid,
          tooltip,
          revealBtn,
          autoReveal: true,
        });
      } else {
        lootSection.classList.remove('active');
        lootGrid.innerHTML = '';
        if (revealBtn) {
          revealBtn.disabled = true;
          revealBtn.classList.add('btn-disabled');
        }
      }
    } else if (lootSection) {
      lootSection.classList.remove('active');
      if (lootGrid) lootGrid.innerHTML = '';
      if (revealBtn) {
        revealBtn.disabled = true;
        revealBtn.classList.add('btn-disabled');
      }
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
      explodeLine.textContent = `Explosion: ${weapon.explodeRadius} pixels`;
      stats.appendChild(explodeLine);
    }

    if (weapon.knockback) {
      const kbLine = document.createElement('div');
      kbLine.textContent = `Knockback: ${weapon.knockback}`;
      stats.appendChild(kbLine);
    }

    if (weapon.area) {
      const areaLine = document.createElement('div');
      areaLine.textContent = `Area: ${weapon.area} pixels`;
      stats.appendChild(areaLine);
    }

    if (weapon.coneLength) {
      const coneLine = document.createElement('div');
      coneLine.textContent = `Range: ${weapon.coneLength} pixels`;
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

  showLevelInfo(weaponId: string, classId?: string): void {
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

    const relics = classId ? getRelicsForClass(classId) : [];
    const className = classId ? (CHARACTERS[classId]?.name ?? classId) : '';
    const relicTooltipData: Record<string, { name: string; affixRanges: string[] }> = {};
    const relicAffixPool = [...AFFIX_POOLS.relic, ...UNIVERSAL_AFFIXES];
    const relicAffixRanges = relicAffixPool.map(definition => this.formatAffixPoolRange(definition));

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
      <div class="level-stat-row">
        <span class="level-stat-label">${label}</span>
        <span class="level-stat-value ${highlight ? 'highlight' : ''}">${value}</span>
      </div>
    `;

    const levelStates = Array.from({ length: 5 }, (_, idx) => getWeaponState(idx + 1));
    const statSpecs: Array<{
      key: string;
      label: string;
      defaultValue: number | boolean;
      format: (value: any) => string;
      always?: boolean;
    }> = [
      { key: 'baseDmg', label: 'Dmg', defaultValue: 0, format: (value) => Math.round(value).toString(), always: true },
      { key: 'cd', label: 'CD', defaultValue: 0, format: (value) => `${(value / 60).toFixed(2)}s`, always: true },
      { key: 'projectileCount', label: 'Projectiles', defaultValue: 1, format: (value) => `${Math.max(1, Math.round(value))}`, always: true },
      { key: 'pierce', label: 'Pierce', defaultValue: 0, format: (value) => `${Math.round(value)}` },
      { key: 'bounces', label: 'Bounces', defaultValue: 0, format: (value) => `${Math.round(value)}` },
      { key: 'explodeRadius', label: 'Aoe', defaultValue: 0, format: (value) => `${Math.round(value)} pixels` },
      { key: 'trailDamage', label: 'Trail Dmg', defaultValue: 0, format: (value) => `${Math.round(value)}` },
      { key: 'speedMult', label: 'Speed', defaultValue: 1, format: (value) => `${Math.round(value * 100)}%` },
      { key: 'knockback', label: 'Knockback', defaultValue: 0, format: (value) => `${Math.round(value)}` },
      { key: 'coneLength', label: 'Range', defaultValue: 0, format: (value) => `${Math.round(value)} pixels` },
      { key: 'coneWidth', label: 'Cone', defaultValue: 0, format: (value) => `${Math.round((value * 180) / Math.PI)}°` },
      { key: 'splits', label: 'Splits', defaultValue: false, format: (value) => (value ? 'YES' : 'NO') },
    ];

    const displayStats = statSpecs.filter(spec => spec.always || levelStates.some(state => {
      const value = (state as any)[spec.key] ?? spec.defaultValue;
      if (typeof spec.defaultValue === 'boolean') {
        return Boolean(value) !== spec.defaultValue;
      }
      return value !== spec.defaultValue;
    }));

    let levelRows = '';
    for (let i = 1; i <= 5; i++) {
      const state = levelStates[i - 1];
      const prevState = i > 1 ? levelStates[i - 2] : null;
      const isCurrent = currentLevel === i;

      // Generate "NEW" bonus lines by comparing current state to previous state
      const dynamicBonuses: string[] = [];
      if (prevState) {
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

      const statLines = displayStats.map(spec => {
        const value = (state as any)[spec.key] ?? spec.defaultValue;
        const prevValue = prevState ? ((prevState as any)[spec.key] ?? spec.defaultValue) : value;
        const highlight = prevState ? value !== prevValue : false;
        return renderStat(spec.label, spec.format(value), highlight);
      }).join('');

      levelRows += `
        <div class="level-row ${isCurrent ? 'current' : ''}">
          <div class="level-num">Level ${i}${isCurrent ? ' (Current)' : ''}</div>
          <div class="level-details">
            <div class="level-stat-table">
              ${statLines}
            </div>
            
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

    const levelListHtml = `<div class="level-list">${levelRows}</div>`;

    let relicListHtml = '';
    if (!classId) {
      relicListHtml = `<div class="relic-empty">Relics are shown when viewing a class.</div>`;
    } else if (relics.length === 0) {
      relicListHtml = `<div class="relic-empty">No relics defined for ${className} yet.</div>`;
    } else {
      const relicEntries = relics.map(relic => {
        relicTooltipData[relic.id] = {
          name: relic.name,
          affixRanges: relicAffixRanges,
        };

        const effectLines = relic.effect.description
          .map(line => `<div class="affix-line implicit-line">${line}</div>`)
          .join('');
        const affixLines = relicAffixRanges
          .map(range => `<div class="affix-line">${range}</div>`)
          .join('');
        const classLine = `Class: ${CHARACTERS[relic.classId]?.name ?? relic.classId}`;

        return `
          <div class="relic-entry relic-entry-card tooltip-relic" data-relic-id="${relic.id}" style="border-color: #f97316;">
            <div class="loadout-detail-title">${relic.name}</div>
            <div class="loadout-detail-meta">LEGENDARY RELIC</div>
            <div class="loadout-detail-base">Base: ${relic.name} (T5)</div>
            <div class="loadout-detail-base">${classLine}</div>
            <div class="loadout-detail-stats">
              <div class="affix-line implicit-line">Unique: ${relic.effect.name}</div>
              ${effectLines}
              <div class="affix-line implicit-line">Affix Pool</div>
              ${affixLines}
            </div>
          </div>
        `;
      }).join('');

      relicListHtml = `
        <div class="relic-list-title">${className} Relics</div>
        <div class="relic-list">${relicEntries}</div>
      `;
    }

    const html = `
      <div class="level-info-title">${name}</div>
      <div class="level-info-desc">${upgrade.desc}</div>
      <div class="level-info-tabs">
        <button class="level-tab active" data-tab="levels">Levels</button>
        <button class="level-tab" data-tab="relics">Relics</button>
      </div>
      <div class="level-info-content">
        <div class="level-tab-content active" data-tab="levels">${levelListHtml}</div>
        <div class="level-tab-content" data-tab="relics">${relicListHtml}</div>
      </div>
      <div class="relic-tooltip"></div>
      <button class="info-popup-close" onclick="UI.hideLevelInfo()">CLOSE</button>
    `;

    popup.innerHTML = html;
    popup.classList.add('active');
    backdrop.classList.add('active');

    const tooltip = popup.querySelector('.relic-tooltip') as HTMLElement | null;
    if (tooltip) {
      document.body.appendChild(tooltip);
    }
    const hideRelicTooltip = () => {
      if (!tooltip) return;
      tooltip.innerHTML = '';
      tooltip.style.display = 'none';
    };

    const positionRelicTooltip = (event: MouseEvent) => {
      if (!tooltip) return;
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      let x = event.clientX + 6;
      let y = event.clientY + 6;
      const maxX = window.innerWidth - width - 8;
      const maxY = window.innerHeight - height - 8;
      if (x > maxX) x = maxX;
      if (y > maxY) y = maxY;
      if (x < 8) x = 8;
      if (y < 8) y = 8;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    };

    const entries = popup.querySelectorAll<HTMLElement>('.relic-entry');
    entries.forEach(entry => {
      const relicId = entry.dataset.relicId || '';
      const data = relicTooltipData[relicId];
      if (!data || !tooltip) return;

      entry.addEventListener('mouseenter', (event: MouseEvent) => {
        tooltip.innerHTML = `
          <div class="relic-tooltip-title">${data.name} Affix Ranges</div>
          <div class="relic-tooltip-list">
            ${data.affixRanges.map(range => `<div class="relic-tooltip-line">${range}</div>`).join('')}
          </div>
        `;
        tooltip.style.display = 'block';
        positionRelicTooltip(event);
      });

      entry.addEventListener('mousemove', (event: MouseEvent) => {
        positionRelicTooltip(event);
      });

      entry.addEventListener('mouseleave', () => {
        hideRelicTooltip();
      });
    });

    const tabs = popup.querySelectorAll<HTMLButtonElement>('.level-tab');
    const contents = popup.querySelectorAll<HTMLElement>('.level-tab-content');
    tabs.forEach(tab => {
      tab.onclick = () => {
        const target = tab.dataset.tab || 'levels';
        tabs.forEach(other => other.classList.toggle('active', other === tab));
        contents.forEach(content => {
          content.classList.toggle('active', content.dataset.tab === target);
        });
        hideRelicTooltip();
      };
    });
  }

  hideLevelInfo(): void {
    const popup = this.getEl('level-info-popup');
    const backdrop = this.getEl('level-info-backdrop');
    if (popup) popup.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    const tooltip = document.querySelector('.relic-tooltip');
    if (tooltip) tooltip.remove();
  }

  private player: { dmgMult: number; weapons: any[] } | null = null;
  setPlayer(player: { dmgMult: number; weapons: any[] }): void {
    this.player = player;
  }
}

export const UI = new UISystem();
(window as any).UI = UI;
