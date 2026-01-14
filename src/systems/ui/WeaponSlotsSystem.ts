import { UPGRADES } from '../../data/upgrades';
import type { Weapon } from '../../types';

export class WeaponSlotsSystem {
  private weaponIconMap: Record<string, string> = {
    bubble_stream: '/bubble_stream.png',
    frying_pan: '/frying_pan.png',
    thrown_cds: '/thrown_cds.png',
    fireball: '/fireball.png',
    lighter: '/lighter.png',
    shield_bash: '/shield_bash.png',
    bow: '/weapons/arrow.png',
  };

  private weaponEmojiMap: Record<string, string> = {
    bubble_stream: '🫧',
    frying_pan: '🍳',
    thrown_cds: '💿',
    fireball: '🔥',
    lighter: '🔥',
    shield_bash: '🛡️',
    bow: '🏹',
  };

  private player: { dmgMult: number } | null = null;

  updateWeaponSlots(
    weapons: Weapon[],
    onShowLevelInfo: (weaponId: string) => void
  ): void {
    const container = document.getElementById('weapon-slots');
    if (!container) return;

    const currentSlots = container.querySelectorAll('.weapon-slot').length;
    if (currentSlots !== weapons.length) {
      container.innerHTML = '';
      weapons.forEach(w => {
        const slot = this.createWeaponSlot(w, onShowLevelInfo);
        container.appendChild(slot);
      });
    }

    this.updateWeaponSlotStates(container, weapons);
  }

  private createWeaponSlot(weapon: Weapon, onShowLevelInfo: (weaponId: string) => void): HTMLDivElement {
    const slot = document.createElement('div');
    slot.className = 'weapon-slot';
    slot.dataset.weaponId = weapon.id;

    const icon = this.createWeaponIcon(weapon);
    const level = document.createElement('span');
    level.className = 'weapon-level';
    level.textContent = `Lv${weapon.level}`;

    const name = document.createElement('span');
    name.className = 'weapon-name';
    const upgrade = UPGRADES[weapon.id];
    name.textContent = upgrade ? upgrade.name.replace(/[A-Z]/g, m => ' ' + m).trim() : weapon.id;

    const infoBtn = document.createElement('div');
    infoBtn.className = 'info-btn';
    infoBtn.textContent = 'i';
    infoBtn.title = 'View Level Path';
    infoBtn.onclick = (e) => {
      e.stopPropagation();
      onShowLevelInfo(weapon.id);
    };

    slot.appendChild(icon);
    slot.appendChild(level);
    slot.appendChild(name);
    slot.appendChild(infoBtn);
    return slot;
  }

  private createWeaponIcon(weapon: Weapon): HTMLImageElement | HTMLSpanElement {
    const icon = document.createElement('img');
    icon.className = 'weapon-icon';
    
    if (this.weaponIconMap[weapon.id]) {
      icon.src = this.weaponIconMap[weapon.id];
      icon.onerror = () => {
        icon.style.display = 'none';
        const emoji = document.createElement('span');
        emoji.className = 'weapon-icon';
        emoji.style.fontSize = '16px';
        emoji.textContent = this.weaponEmojiMap[weapon.id] || '⚔️';
        icon.parentElement?.insertBefore(emoji, icon);
      };
    } else {
      icon.style.display = 'none';
      const emoji = document.createElement('span');
      emoji.className = 'weapon-icon';
      emoji.style.fontSize = '16px';
      emoji.textContent = this.weaponEmojiMap[weapon.id] || '⚔️';
      icon.parentElement?.appendChild(emoji);
    }
    
    return icon;
  }

  private updateWeaponSlotStates(container: HTMLElement, weapons: Weapon[]): void {
    const slots = container.querySelectorAll('.weapon-slot') as NodeListOf<HTMLElement>;
    
    weapons.forEach((w, i) => {
      const slot = slots[i];
      if (!slot) return;

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
        const tooltip = document.getElementById('weapon-tooltip');
        if (tooltip && tooltip.style.display !== 'none') {
          this.showWeaponTooltip(w, event);
        }
      };
      slot.onmouseleave = () => this.hideWeaponTooltip();
    });
  }

  showWeaponTooltip(weapon: Weapon, event?: MouseEvent): void {
    const tooltip = document.getElementById('weapon-tooltip');
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

    const stats = this.buildWeaponStats(weapon);

    tooltip.appendChild(title);
    tooltip.appendChild(desc);
    tooltip.appendChild(stats);
    tooltip.style.display = 'block';

    if (event) {
      this.positionTooltip(tooltip, event.clientX, event.clientY);
    }
  }

  private buildWeaponStats(weapon: Weapon): HTMLDivElement {
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

    return stats;
  }

  private positionTooltip(tooltip: HTMLElement, clientX: number, clientY: number): void {
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let x = clientX + 12;
    let y = clientY + 12;
    const maxX = window.innerWidth - width - 8;
    const maxY = window.innerHeight - height - 8;
    if (x > maxX) x = maxX;
    if (y > maxY) y = maxY;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  hideWeaponTooltip(): void {
    const tooltip = document.getElementById('weapon-tooltip');
    if (tooltip) {
      tooltip.innerHTML = '';
      tooltip.style.display = 'none';
    }
  }

  setPlayer(player: { dmgMult: number }): void {
    this.player = player;
  }
}
