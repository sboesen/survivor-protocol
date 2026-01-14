import type { Item } from '../../items/types';
import { LootRevealSystem } from './LootRevealSystem';

export class ExtractionScreenSystem {
  showExtractionScreen(items: Item[], onContinue: () => void): void {
    const screen = document.getElementById('extract-screen');
    const grid = document.getElementById('extract-grid');
    const revealBtn = document.getElementById('extract-reveal-btn') as HTMLButtonElement | null;
    const continueBtn = document.getElementById('extract-continue-btn') as HTMLButtonElement | null;
    const tooltip = document.getElementById('extract-tooltip');
    const confettiLayer = document.getElementById('extract-confetti');

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
    const screen = document.getElementById('extract-screen');
    const tooltip = document.getElementById('extract-tooltip');
    if (screen) screen.classList.remove('active');
    if (tooltip) {
      tooltip.innerHTML = '';
      tooltip.style.display = 'none';
    }
  }
}
