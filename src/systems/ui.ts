import { CHARACTERS } from '../data/characters';
import { UPGRADES } from '../data/upgrades';
import { Utils } from '../utils';

class UISystem {
  updateHud(
    gold: number,
    time: number,
    level: number,
    kills: number,
    selectedChar: string
  ): void {
    const goldEl = document.getElementById('hud-gold');
    const timerEl = document.getElementById('hud-timer');
    const levelEl = document.getElementById('hud-level');
    const killsEl = document.getElementById('hud-kills');
    const charEl = document.getElementById('hud-char');

    if (goldEl) goldEl.textContent = `💰 ${gold}`;
    if (timerEl) timerEl.textContent = Utils.fmtTime(time);
    if (levelEl) levelEl.textContent = level.toString();
    if (killsEl) killsEl.textContent = kills.toString();
    if (charEl) {
      const char = CHARACTERS[selectedChar];
      if (char) charEl.textContent = char.name;
    }
  }

  updateXp(current: number, max: number, level: number): void {
    const xpBar = document.getElementById('xp-bar-fill');
    const levelEl = document.getElementById('hud-level');

    if (xpBar) xpBar.style.width = `${(current / max) * 100}%`;
    if (levelEl) levelEl.textContent = level.toString();
  }

  updateUlt(current: number, max: number): void {
    const pct = Math.min(1, current / max);
    const btn = document.getElementById('ult-btn');
    const overlay = document.getElementById('ult-cooldown-overlay');

    if (overlay) overlay.style.height = `${100 - pct * 100}%`;
    if (btn) {
      if (pct >= 1) btn.classList.add('ready');
      else btn.classList.remove('ready');
    }
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
  ): HTMLElement {
    const el = document.createElement('div');
    el.className = 'dmg-text ' + (isCrit ? 'crit-text' : '');
    if (color === '#f00') el.classList.add('player-hit');
    el.textContent = txt.toString() + (isCrit ? '!' : '');
    el.style.color = color;

    const layer = document.getElementById('damage-layer');
    if (layer) layer.appendChild(el);

    return el;
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
      t.el.style.transform = `translate(${rx + window.innerWidth / 2}px, ${ry + window.innerHeight / 2 - (50 - t.life)}px) scale(${scale})`;
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

    const titleEl = document.getElementById('go-title');
    const statsEl = document.getElementById('go-stats');

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

    const screen = document.getElementById('gameover-screen');
    if (screen) screen.classList.add('active');
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
    const container = document.getElementById('card-container');
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
        if (def.dmg !== undefined) {
          const baseDmg = def.dmg * Math.pow(1.3, lvl);
          statsHtml = `<div style="color:#4ade80">⚔ ${Math.round(baseDmg)} Damage</div>`;
        }
        if (def.cd !== undefined) {
          const baseCd = def.cd * Math.pow(0.9, lvl);
          statsHtml += `<div style="color:#60a5fa">⏱ ${Math.round(baseCd / 10) / 10}s Cooldown</div>`;
        }
        if (def.area !== undefined) {
          const baseArea = def.area + (lvl * 15);
          statsHtml += `<div style="color:#f472b6">◎ ${baseArea} Area</div>`;
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
        const screen = document.getElementById('levelup-screen');
        if (screen) screen.classList.remove('active');
      };
      container.appendChild(el);
    });

    const screen = document.getElementById('levelup-screen');
    if (screen) screen.classList.add('active');
  }
}

export const UI = new UISystem();
