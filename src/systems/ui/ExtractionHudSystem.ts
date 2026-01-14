import { wrapRelativePosition } from '../movement';
import type { ExtractionState } from '../../types';

export class ExtractionHudSystem {
  updateExtractionHud(state: ExtractionState, playerX: number, playerY: number, frames: number): void {
    const warningEl = document.getElementById('extract-warning');
    const countdownEl = document.getElementById('extract-countdown');
    const progressEl = document.getElementById('extract-progress');
    const arrowEl = document.getElementById('extract-arrow');

    const warningActive = state.warningEndTime > frames;
    if (warningEl) {
      if (warningActive) {
        const seconds = Math.max(0, Math.ceil((state.warningEndTime - frames) / 60));
        warningEl.textContent = `EXTRACT IN: ${seconds}s`;
        warningEl.style.display = 'block';
      } else {
        warningEl.style.display = 'none';
      }
    }

    const zone = state.currentZone && state.currentZone.active ? state.currentZone : null;
    if (countdownEl) {
      if (zone) {
        const seconds = Math.max(0, Math.ceil((zone.expiresAt - frames) / 60));
        countdownEl.textContent = `EXTRACT ZONE: ${seconds}s`;
        countdownEl.style.display = 'block';
      } else {
        countdownEl.style.display = 'none';
      }
    }

    if (progressEl) {
      if (zone && zone.inZone) {
        const progress = Math.min(100, Math.floor((zone.extractionProgress / (60 * 5)) * 100));
        progressEl.textContent = `EXTRACTING: ${progress}%`;
        progressEl.style.display = 'block';
      } else {
        progressEl.style.display = 'none';
      }
    }

    const target = state.pendingZone
      ? state.pendingZone
      : zone
        ? { x: zone.x, y: zone.y }
        : null;

    if (arrowEl) {
      if (target) {
        const dx = wrapRelativePosition(target.x - playerX);
        const dy = wrapRelativePosition(target.y - playerY);
        const onScreen = Math.abs(dx) < window.innerWidth / 2 - 140 &&
          Math.abs(dy) < window.innerHeight / 2 - 140;

        const angle = Math.atan2(dy, dx);
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const radius = onScreen
          ? 55
          : Math.min(window.innerWidth, window.innerHeight) / 2 - 40;

        arrowEl.style.left = `${centerX + Math.cos(angle) * radius}px`;
        arrowEl.style.top = `${centerY + Math.sin(angle) * radius}px`;
        arrowEl.style.transform = `translate(-50%, -50%) rotate(${angle + Math.PI / 2}rad) scale(${onScreen ? 0.75 :1})`;
        arrowEl.style.opacity = onScreen ? '0.45' : '0.9';
        arrowEl.style.display = 'block';
      } else {
        arrowEl.style.display = 'none';
      }
    }
  }

  hideExtractionHud(): void {
    const warningEl = document.getElementById('extract-warning');
    const countdownEl = document.getElementById('extract-countdown');
    const progressEl = document.getElementById('extract-progress');
    const arrowEl = document.getElementById('extract-arrow');

    if (warningEl) warningEl.style.display = 'none';
    if (countdownEl) countdownEl.style.display = 'none';
    if (progressEl) progressEl.style.display = 'none';
    if (arrowEl) arrowEl.style.display = 'none';
  }
}
