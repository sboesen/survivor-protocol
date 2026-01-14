import type { Item } from '../../items/types';
import { LootRevealSystem } from './LootRevealSystem';

export class GameOverScreenSystem {
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

    this.setupLootSection(success, securedItems);

    const screen = document.getElementById('gameover-screen');
    if (screen) screen.classList.add('active');
  }

  hideGameOverScreen(): void {
    const screen = document.getElementById('gameover-screen');
    if (screen) screen.classList.remove('active');
  }

  private setupLootSection(success: boolean, securedItems: Item[]): void {
    const lootSection = document.getElementById('go-loot');
    const lootGrid = document.getElementById('go-loot-grid');
    const revealBtn = document.getElementById('go-reveal-btn') as HTMLButtonElement | null;
    const tooltip = document.getElementById('extract-tooltip');

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
  }
}
