import './style.css';
import { Game } from './game';
import { Menu } from './systems/menu';
import { GachaAnim } from './systems/gacha';
import { Debug } from './systems/debug';

// Expose to window for HTML onclick handlers
(window as any).Game = Game;
(window as any).Menu = Menu;
(window as any).GachaAnim = GachaAnim;
(window as any).Debug = Debug;

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Game.init());
} else {
  Game.init();
}
