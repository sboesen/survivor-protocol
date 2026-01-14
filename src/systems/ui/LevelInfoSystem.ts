import { CHARACTERS } from '../../data/characters';
import { UPGRADES } from '../../data/upgrades';
import { WEAPON_LEVELS, ATTRIBUTE_LABELS, UNIVERSAL_UPGRADES } from '../../data/leveling';
import { getRelicsForClass } from '../../data/relics';
import { AFFIX_POOLS, UNIVERSAL_AFFIXES } from '../../items/affixTables';
import type { AffixDefinition } from '../../items/types';

export class LevelInfoSystem {
  showLevelInfo(weaponId: string, classId?: string): void {
    const popup = document.getElementById('level-info-popup');
    const backdrop = document.getElementById('level-info-backdrop');
    if (!popup || !backdrop) return;

    const upgrade = UPGRADES[weaponId];
    const levels = WEAPON_LEVELS[weaponId];
    if (!upgrade) return;

    const name = upgrade.name.replace(/[A-Z]/g, m => ' ' + m).trim();
    let currentLevel = 1;

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

    const w = (window as any).Game?.player?.weapons.find((w: any) => w.id === weaponId);
    if (w) currentLevel = w.level;

    const relics = classId ? getRelicsForClass(classId) : [];
    const className = classId ? (CHARACTERS[classId]?.name ?? classId) : '';
    const relicTooltipData: Record<string, { name: string; affixRanges: string[] }> = {};
    const relicAffixPool = [...AFFIX_POOLS.relic, ...UNIVERSAL_AFFIXES];
    const relicAffixRanges = relicAffixPool.map(definition => this.formatAffixPoolRange(definition));

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

      const dynamicBonuses: string[] = [];
      if (prevState) {
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

    this.setupRelicTooltips(popup, relicTooltipData);
    this.setupTabs(popup);
  }

  private setupRelicTooltips(popup: HTMLElement, relicTooltipData: Record<string, { name: string; affixRanges: string[] }>): void {
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
  }

  private setupTabs(popup: HTMLElement): void {
    const tabs = popup.querySelectorAll<HTMLButtonElement>('.level-tab');
    const contents = popup.querySelectorAll<HTMLElement>('.level-tab-content');
    tabs.forEach(tab => {
      tab.onclick = () => {
        const target = tab.dataset.tab || 'levels';
        tabs.forEach(other => other.classList.toggle('active', other === tab));
        contents.forEach(content => {
          content.classList.toggle('active', content.dataset.tab === target);
        });
        const tooltip = popup.querySelector('.relic-tooltip') as HTMLElement | null;
        if (tooltip) {
          tooltip.innerHTML = '';
          tooltip.style.display = 'none';
        }
      };
    });
  }

  hideLevelInfo(): void {
    const popup = document.getElementById('level-info-popup');
    const backdrop = document.getElementById('level-info-backdrop');
    if (popup) popup.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    const tooltip = document.querySelector('.relic-tooltip');
    if (tooltip) tooltip.remove();
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
}
