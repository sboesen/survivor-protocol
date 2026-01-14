import { CHARACTERS } from '../../data/characters';
import { Utils } from '../../utils';
import type { Item } from '../../items/types';

export class HudSystem {
  private cache: Record<string, HTMLElement | null> = {};

  constructor() {
    this.cacheElements();
  }

  private cacheElements(): void {
    this.cache['hud-gold'] = document.getElementById('hud-gold');
    this.cache['hud-timer'] = document.getElementById('hud-timer');
    this.cache['hud-level'] = document.getElementById('hud-level');
    this.cache['hud-kills'] = document.getElementById('hud-kills');
    this.cache['hud-char'] = document.getElementById('hud-char');
    this.cache['hud-particles'] = document.getElementById('hud-particles');
    this.cache['hud-enemies'] = document.getElementById('hud-enemies');
    this.cache['xp-bar-fill'] = document.getElementById('xp-bar-fill');
    this.cache['ult-btn'] = document.getElementById('ult-btn');
    this.cache['ult-cooldown-overlay'] = document.getElementById('ult-cooldown-overlay');
    this.cache['hud-veiled'] = document.getElementById('hud-veiled');
    this.cache['hud-loot-summary'] = document.getElementById('hud-loot-summary');
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
    const goldEl = this.cache['hud-gold'];
    const timerEl = this.cache['hud-timer'];
    const levelEl = this.cache['hud-level'];
    const killsEl = this.cache['hud-kills'];
    const charEl = this.cache['hud-char'];
    const particlesEl = this.cache['hud-particles'];
    const enemiesEl = this.cache['hud-enemies'];

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

  updateXp(current: number, max: number, level: number): void {
    const xpBar = this.cache['xp-bar-fill'];
    const levelEl = this.cache['hud-level'];

    if (xpBar) xpBar.style.width = `${(current / max) * 100}%`;
    if (levelEl) levelEl.textContent = level.toString();
  }

  updateUlt(current: number, max: number): void {
    const pct = Math.min(1, current / max);
    const btn = this.cache['ult-btn'];
    const overlay = this.cache['ult-cooldown-overlay'];

    if (overlay) overlay.style.height = `${100 - pct * 100}%`;
    if (btn) {
      if (pct >= 1) btn.classList.add('ready');
      else btn.classList.remove('ready');
    }
  }

  updateVeiledCount(count: number): void {
    const veiledEl = this.cache['hud-veiled'];
    if (veiledEl) veiledEl.textContent = `Veiled: ${count}`;
  }

  updateLootSummaryHud(items: Item[]): void {
    const el = this.cache['hud-loot-summary'];
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

  clearCache(): void {
    this.cache = {};
  }
}
