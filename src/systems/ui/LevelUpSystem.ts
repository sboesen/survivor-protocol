import { UPGRADES } from '../../data/upgrades';

interface LevelUpStats {
  items: { pierce: number; cooldown: number; projectile: number };
  critChance: number;
  dmgMult: number;
}

export class LevelUpSystem {
  showLevelUpScreen(
    choices: string[],
    inventory: Record<string, number>,
    currentStats: LevelUpStats,
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

      const statsHtml = this.buildStatsHtml(def, lvl, currentStats);

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

  private buildStatsHtml(def: any, lvl: number, currentStats: LevelUpStats): string {
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
    return statsHtml;
  }
}
