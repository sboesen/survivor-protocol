import { LootRevealSystem } from './LootRevealSystem';

export class ExtractionScreenSystem {
  showExtractionScreen(
    items: any[],
    onContinue: () => void,
    getEl: (id: string) => HTMLElement | null,
    hideExtractionScreen: () => void
  ): void {
    const screen = getEl('extract-screen');
    const grid = getEl('extract-grid');
    const revealBtn = getEl('extract-reveal-btn') as HTMLButtonElement | null;
    const continueBtn = getEl('extract-continue-btn') as HTMLButtonElement | null;
    const tooltip = getEl('extract-tooltip');
    const confettiLayer = getEl('extract-confetti');

    if (screen) screen.classList.add('active');
    if (!grid) return;

    new LootRevealSystem({
      items,
      grid,
      tooltip,
      revealBtn,
      continueBtn: continueBtn ?? undefined,
      onContinue: () => {
        hideExtractionScreen();
        onContinue();
      },
      confettiLayer: confettiLayer ?? undefined,
    });
  }

  hideExtractionScreen(getEl: (id: string) => HTMLElement | null): void {
    const screen = getEl('extract-screen');
    const tooltip = getEl('extract-tooltip');
    if (screen) screen.classList.remove('active');
    if (tooltip) {
      tooltip.innerHTML = '';
      tooltip.style.display = 'none';
    }
  }
}
