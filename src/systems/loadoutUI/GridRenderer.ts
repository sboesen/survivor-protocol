import type { LoadoutData } from '../../types';
import { ItemStats } from '../../items/stats';
import { CHARACTERS } from '../../data/characters';
import { SaveData } from '../saveData';

export class GridRenderer {
  updateSummary(loadout: LoadoutData): void {
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
    const selectedChar = CHARACTERS[selectedCharId as keyof typeof CHARACTERS] ?? CHARACTERS.wizard;
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

    this.updateScrapDisplay(SaveData.data.scrap.toString());
  }

  private updateScrapDisplay(scrapVal: string): void {
    ['shop-scrap-display', 'stash-scrap-counter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.textContent !== scrapVal) {
          el.classList.remove('counter-pop');
          void el.offsetWidth;
          el.classList.add('counter-pop');
        }
        el.textContent = scrapVal;
      }
    });

    const hudScrap = document.getElementById('hud-scrap');
    if (hudScrap) {
      const displayVal = `⚙️ ${scrapVal}`;
      if (hudScrap.textContent !== displayVal) {
        hudScrap.classList.remove('counter-pop');
        void hudScrap.offsetWidth;
        hudScrap.classList.add('counter-pop');
      }
      hudScrap.textContent = displayVal;
    }
  }
}
