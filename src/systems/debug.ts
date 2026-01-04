import { SaveData } from './saveData';
import { CHARACTERS } from '../data/characters';
import { CONFIG } from '../config';
import { Game } from '../game';

class DebugSystem {
  addGold(amt: number): void {
    SaveData.data.gold += amt;
    SaveData.save();

    const gachaGold = document.getElementById('gacha-gold');
    const shopGold = document.getElementById('shop-gold-display');

    if (gachaGold) gachaGold.textContent = SaveData.data.gold.toString();
    if (shopGold) shopGold.textContent = SaveData.data.gold.toString();
  }

  unlockAll(): void {
    SaveData.data.ownedChars = Object.keys(CHARACTERS);
    SaveData.save();
  }

  resetProgress(): void {
    if (confirm('THIS WILL ERASE EVERYTHING! Continue?')) {
      localStorage.removeItem('survivor_protocol_v2');
      location.reload();
    }
  }

  /**
   * Teleport player to a specific world position.
   * Useful for testing world wrapping behavior.
   */
  teleport(x: number, y: number): void {
    if (Game.player) {
      Game.player.x = ((x % CONFIG.worldSize) + CONFIG.worldSize) % CONFIG.worldSize;
      Game.player.y = ((y % CONFIG.worldSize) + CONFIG.worldSize) % CONFIG.worldSize;
      console.log(`Teleported to (${Game.player.x.toFixed(0)}, ${Game.player.y.toFixed(0)})`);
    }
  }

  /**
   * Teleport to the left edge of the world (testing wrapping from left to right)
   */
  teleportToLeftEdge(): void {
    this.teleport(50, CONFIG.worldSize / 2);
  }

  /**
   * Teleport to the right edge of the world (testing wrapping from right to left)
   */
  teleportToRightEdge(): void {
    this.teleport(CONFIG.worldSize - 50, CONFIG.worldSize / 2);
  }

  /**
   * Teleport to the top edge of the world
   */
  teleportToTopEdge(): void {
    this.teleport(CONFIG.worldSize / 2, 50);
  }

  /**
   * Teleport to the bottom edge of the world
   */
  teleportToBottomEdge(): void {
    this.teleport(CONFIG.worldSize / 2, CONFIG.worldSize - 50);
  }

  /**
   * Teleport to center of world
   */
  teleportToCenter(): void {
    this.teleport(CONFIG.worldSize / 2, CONFIG.worldSize / 2);
  }

  /**
   * Spawn test enemies at various positions to verify wrapping
   */
  spawnTestEnemies(): void {
    if (!Game.player) return;

    const positions = [
      [100, CONFIG.worldSize / 2],
      [CONFIG.worldSize - 100, CONFIG.worldSize / 2],
      [CONFIG.worldSize / 2, 100],
      [CONFIG.worldSize / 2, CONFIG.worldSize - 100],
      [Game.player.x + 200, Game.player.y],
      [Game.player.x - 200, Game.player.y],
    ];

    positions.forEach(([x, y]) => {
      // Import Enemy dynamically to avoid circular dependency
      import('../entities/enemy').then(({ Enemy }) => {
        const enemy = new Enemy(x, y, 'basic', 0);
        Game.enemies.push(enemy);
      });
    });

    console.log(`Spawned ${positions.length} test enemies for wrapping verification`);
  }

  /**
   * Print current player position and camera info
   */
  printPositionInfo(): void {
    if (!Game.player) {
      console.log('No active player');
      return;
    }
    console.log(`Player: (${Game.player.x.toFixed(1)}, ${Game.player.y.toFixed(1)})`);
    console.log(`World size: ${CONFIG.worldSize}`);
    console.log(`Enemies: ${Game.enemies.length}`);
  }
}

export const Debug = new DebugSystem();
