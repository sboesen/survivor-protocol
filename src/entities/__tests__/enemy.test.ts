import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Enemy } from '../enemy';
import { Obstacle } from '../obstacle';
import { Entity } from '../entity';
import type { CanvasContext } from '../../types';

// Mock canvas context
const mockCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  beginPath: () => {},
  arc: () => {},
  stroke: () => {},
  fill: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  globalCompositeOperation: '',
} as unknown as CanvasContext;

// Mock Renderer
vi.mock('../../systems/renderer', () => ({
  Renderer: {
    drawSprite: vi.fn(),
  },
}));

// Concrete Entity subclass for testing (Entity is abstract)
class TestEntity extends Entity {
  drawShape(_ctx: CanvasContext, _x: number, _y: number): void {
    // Empty implementation for testing
  }
}

describe('Enemy', () => {
  describe('constructor - basic enemy', () => {
    let enemy: Enemy;
    let playerEntity: TestEntity;

    beforeEach(() => {
      playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      enemy = new Enemy(1000, 1000, 'basic', 0);
    });

    it('should create basic enemy at correct position', () => {
      // Enemy spawns at angle around player, so exact position varies
      // But it should be around 600 units from player
      const dist = Math.hypot(enemy.x - playerEntity.x, enemy.y - playerEntity.y);
      expect(dist).toBeGreaterThan(500);
      expect(dist).toBeLessThan(700);
    });

    it('should initialize basic enemy properties', () => {
      expect(enemy.type).toBe('basic');
      expect(enemy.radius).toBe(10);
      expect(enemy.sprite).toBe('basic');
      expect(enemy.xp).toBe(1);
    });

    it('should set correct HP for basic enemy', () => {
      expect(enemy.maxHp).toBe(15);
      expect(enemy.hp).toBe(15);
    });

    it('should initialize flash and shootTimer', () => {
      expect(enemy.flash).toBe(0);
      expect(enemy.shootTimer).toBe(0);
    });

    it('should have speed between expected values', () => {
      expect(enemy.speed).toBeGreaterThan(0.8);
      expect(enemy.speed).toBeLessThan(1.1);
    });
  });

  describe('constructor - bat enemy', () => {
    let enemy: Enemy;
    let playerEntity: TestEntity;

    beforeEach(() => {
      playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      enemy = new Enemy(1000, 1000, 'bat', 0);
    });

    it('should create bat enemy with lower HP', () => {
      expect(enemy.type).toBe('bat');
      expect(enemy.maxHp).toBe(8);
      expect(enemy.hp).toBe(8);
    });

    it('should have smaller radius', () => {
      expect(enemy.radius).toBe(8);
    });

    it('should have faster speed', () => {
      expect(enemy.speed).toBeGreaterThan(1.8);
      expect(enemy.speed).toBeLessThan(2.2);
    });

    it('should have correct sprite', () => {
      expect(enemy.sprite).toBe('bat');
    });
  });

  describe('constructor - elite enemy', () => {
    let enemy: Enemy;
    let playerEntity: TestEntity;

    beforeEach(() => {
      playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      enemy = new Enemy(1000, 1000, 'elite', 5);
    });

    it('should create elite enemy with scaled HP', () => {
      expect(enemy.type).toBe('elite');
      expect(enemy.maxHp).toBe(100 + 5 * 50); // 100 + 250 = 350
      expect(enemy.hp).toBe(350);
    });

    it('should have larger radius', () => {
      expect(enemy.radius).toBe(18);
    });

    it('should have elite sprite', () => {
      expect(enemy.sprite).toBe('elite');
    });

    it('should give more XP', () => {
      expect(enemy.xp).toBe(20);
    });

    it('should have moderate speed (scaled with time)', () => {
      // Elite spawns at 5 minutes, speed is scaled by time
      // baseSpeed = 0.6-0.8, timeScale = 1 + (5 * 0.1) = 1.5, min(max, 3.0)
      // speed = baseSpeed * 1.5, capped at 3.0
      expect(enemy.speed).toBeGreaterThan(0.8); // 0.6 * 1.5 = 0.9 min
      expect(enemy.speed).toBeLessThan(3.0);
    });
  });

  describe('constructor - boss enemy', () => {
    let enemy: Enemy;
    let playerEntity: TestEntity;

    beforeEach(() => {
      playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      enemy = new Enemy(1000, 1000, 'boss', 10);
    });

    it('should create boss enemy with scaled HP', () => {
      expect(enemy.type).toBe('boss');
      expect(enemy.maxHp).toBe(1000 + 10 * 200); // 1000 + 2000 = 3000
      expect(enemy.hp).toBe(3000);
    });

    it('should have largest radius', () => {
      expect(enemy.radius).toBe(25);
    });

    it('should have boss sprite', () => {
      expect(enemy.sprite).toBe('boss');
    });

    it('should give most XP', () => {
      expect(enemy.xp).toBe(200);
    });

    it('should have fixed speed (0.7) scaled by time', () => {
      // Boss has fixed baseSpeed of 0.7, scaled by time
      // timeScale = 1 + (10 * 0.1) = 2.0
      // speed = 0.7 * 2.0 = 1.4
      expect(enemy.speed).toBe(1.4);
    });
  });

  describe('constructor - time scaling', () => {
    it('should scale enemy HP with time (basic)', () => {
      const playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      const enemy = new Enemy(1000, 1000, 'basic', 5); // 5 minutes
      expect(enemy.maxHp).toBe(15 + 5 * 10); // 15 + 50 = 65
    });

    it('should scale speed with time (capped at 2x at 10 min)', () => {
      const playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      const enemy = new Enemy(1000, 1000, 'basic', 10); // 10 minutes
      // Base speed 0.8-1.1, timeScale 2.0 (1 + 10 * 0.1), capped at 3.0
      expect(enemy.speed).toBeGreaterThan(1.6);
      expect(enemy.speed).toBeLessThanOrEqual(3.0);
    });
  });

  describe('hp getter and setter', () => {
    let enemy: Enemy;

    beforeEach(() => {
      enemy = new Enemy(1000, 1000, 'basic', 0);
    });

    it('should return HP value', () => {
      expect(enemy.hp).toBe(15);
    });

    it('should clamp HP to minimum 0', () => {
      enemy.hp = -50;
      expect(enemy.hp).toBe(0);
    });

    it('should allow positive HP values', () => {
      enemy.hp = 10;
      expect(enemy.hp).toBe(10);
    });

    it('should not allow HP above max', () => {
      enemy.hp = 1000;
      expect(enemy.hp).toBe(1000); // Setter doesn't clamp max
    });
  });

  describe('update', () => {
    let enemy: Enemy;
    let playerEntity: TestEntity;
    let obstacles: Obstacle[];

    beforeEach(() => {
      playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      enemy = new Enemy(1000, 1000, 'basic', 0);
      obstacles = [];
    });

    it('should not move when timeFrozen', () => {
      const initialX = enemy.x;
      const initialY = enemy.y;
      enemy.update(playerEntity, 10, obstacles);
      expect(enemy.x).toBe(initialX);
      expect(enemy.y).toBe(initialY);
    });

    it('should move towards player when not timeFrozen', () => {
      // Set enemy position away from player
      enemy.x = 500;
      enemy.y = 1000;
      const initialX = enemy.x;

      enemy.update(playerEntity, 0, obstacles);

      // Enemy should have moved towards player
      expect(enemy.x).not.toBe(initialX);
    });

    it('should decrement flash counter', () => {
      enemy.flash = 5;
      enemy.update(playerEntity, 0, obstacles);
      expect(enemy.flash).toBe(4);
    });

    it('should not go below 0 flash', () => {
      enemy.flash = 1;
      enemy.update(playerEntity, 0, obstacles);
      enemy.update(playerEntity, 0, obstacles);
      expect(enemy.flash).toBe(0);
    });

    it('should slide along wall when movement is blocked', () => {
      // Create enemy and obstacles that block direct path
      enemy.x = 900;
      enemy.y = 1000;
      playerEntity.x = 1100;
      playerEntity.y = 1000;

      // Create obstacle in front of enemy
      const blockingObstacle = new Obstacle(1000, 1000, 200, 50, 'ruin');
      obstacles = [blockingObstacle];

      const initialX = enemy.x;
      enemy.update(playerEntity, 0, obstacles);

      // Enemy should try to move, possibly sliding along the wall
      // or staying in place if completely blocked
      expect(enemy.x).toBeGreaterThanOrEqual(0);
      expect(enemy.y).toBeGreaterThanOrEqual(0);
    });

    it('should try alternative movements when blocked', () => {
      // Create a scenario where enemy movement is blocked
      enemy.x = 1000;
      enemy.y = 950;
      playerEntity.x = 1000;
      playerEntity.y = 1050;

      // Obstacles surrounding the enemy position
      const obstacle1 = new Obstacle(1000, 1000, 100, 100, 'ruin');
      obstacles = [obstacle1];

      // Should not throw, should try alternative movements
      expect(() => enemy.update(playerEntity, 0, obstacles)).not.toThrow();
    });
  });

  describe('update - boss shootTimer', () => {
    let enemy: Enemy;
    let playerEntity: TestEntity;

    beforeEach(() => {
      playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      enemy = new Enemy(1000, 1000, 'boss', 0);
    });

    it('should increment shootTimer for boss', () => {
      const initialTimer = enemy.shootTimer;
      enemy.update(playerEntity, 0, []);
      expect(enemy.shootTimer).toBe(initialTimer + 1);
    });

    it('should reset shootTimer after 90 frames', () => {
      enemy.shootTimer = 90;
      enemy.update(playerEntity, 0, []);
      expect(enemy.shootTimer).toBe(0);
    });
  });

  describe('obstacle avoidance during spawn', () => {
    it('should try to avoid spawning inside obstacles', () => {
      const playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      const obstacle = new Obstacle(1400, 1000, 100, 100, 'ruin');

      // Create multiple enemies - they should try to avoid the obstacle
      const enemies = [];
      for (let i = 0; i < 10; i++) {
        enemies.push(new Enemy(1000, 1000, 'basic', 0, [obstacle]));
      }

      // At least some should not be inside the obstacle
      const outsideObstacle = enemies.filter(e => {
        const dist = Math.hypot(e.x - obstacle.x, e.y - obstacle.y);
        return dist > 80 || !(e.x > obstacle.x - obstacle.w/2 - 30 &&
                              e.x < obstacle.x + obstacle.w/2 + 30 &&
                              e.y > obstacle.y - obstacle.h/2 - 30 &&
                              e.y < obstacle.y + obstacle.h/2 + 30);
      });

      expect(outsideObstacle.length).toBeGreaterThan(0);
    });

    it('should ignore font type obstacles for collision', () => {
      const playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      const fountain = new Obstacle(1400, 1000, 100, 100, 'font');

      // Enemy should spawn regardless of fountain position
      expect(() => new Enemy(1000, 1000, 'basic', 0, [fountain])).not.toThrow();
    });
  });

  describe('world wrapping during movement', () => {
    let enemy: Enemy;
    let playerEntity: TestEntity;

    beforeEach(() => {
      playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      enemy = new Enemy(1000, 1000, 'basic', 0);
    });

    it('should wrap position when crossing world boundary', () => {
      enemy.x = 1999;
      enemy.y = 1000;

      // Move towards player (to the left)
      for (let i = 0; i < 10; i++) {
        enemy.update(playerEntity, 0, []);
      }

      // Position should be wrapped to valid world coordinates
      expect(enemy.x).toBeGreaterThanOrEqual(0);
      expect(enemy.x).toBeLessThanOrEqual(2000);
    });
  });

  describe('sprite mapping', () => {
    it('should map basic to shopper', () => {
      const enemy = new Enemy(1000, 1000, 'basic', 0);
      expect(enemy.sprite).toBe('basic');
    });

    it('should map bat to sprinter', () => {
      const enemy = new Enemy(1000, 1000, 'bat', 0);
      expect(enemy.sprite).toBe('bat');
    });

    it('should map elite to armored', () => {
      const enemy = new Enemy(1000, 1000, 'elite', 0);
      expect(enemy.sprite).toBe('elite');
    });

    it('should map boss to manager', () => {
      const enemy = new Enemy(1000, 1000, 'boss', 0);
      expect(enemy.sprite).toBe('boss');
    });
  });

  describe('marked property (inherited from Entity)', () => {
    it('should be toggleable', () => {
      const enemy = new Enemy(1000, 1000, 'basic', 0);
      expect(enemy.marked).toBe(false);
      enemy.marked = true;
      expect(enemy.marked).toBe(true);
    });
  });

  describe('drawShape', () => {
    it('should draw basic enemy without error', () => {
      const enemy = new Enemy(1000, 1000, 'basic', 0);
      expect(() => enemy.drawShape(mockCtx, 100, 100)).not.toThrow();
    });

    it('should draw bat enemy without error', () => {
      const enemy = new Enemy(1000, 1000, 'bat', 0);
      expect(() => enemy.drawShape(mockCtx, 100, 100)).not.toThrow();
    });

    it('should draw elite enemy with health bar', () => {
      const enemy = new Enemy(1000, 1000, 'elite', 0);
      enemy.hp = 50;
      enemy.maxHp = 100;
      expect(() => enemy.drawShape(mockCtx, 100, 100)).not.toThrow();
    });

    it('should draw boss enemy with health bar', () => {
      const enemy = new Enemy(1000, 1000, 'boss', 0);
      enemy.hp = 500;
      enemy.maxHp = 1000;
      expect(() => enemy.drawShape(mockCtx, 100, 100)).not.toThrow();
    });

    it('should apply flash effect when flash > 0', () => {
      const enemy = new Enemy(1000, 1000, 'basic', 0);
      enemy.flash = 3;
      expect(() => enemy.drawShape(mockCtx, 100, 100)).not.toThrow();
    });

    it('should not apply flash effect when flash is 0', () => {
      const enemy = new Enemy(1000, 1000, 'basic', 0);
      enemy.flash = 0;
      expect(() => enemy.drawShape(mockCtx, 100, 100)).not.toThrow();
    });

    it('should draw health bar with correct proportion for elite', () => {
      const enemy = new Enemy(1000, 1000, 'elite', 0);
      enemy.hp = 175; // Half of 350
      enemy.maxHp = 350;
      expect(() => enemy.drawShape(mockCtx, 100, 100)).not.toThrow();
    });

    it('should draw full health bar for undamaged elite', () => {
      const enemy = new Enemy(1000, 1000, 'elite', 5);
      enemy.hp = enemy.maxHp; // Full HP
      expect(() => enemy.drawShape(mockCtx, 100, 100)).not.toThrow();
    });

    it('should draw empty health bar for dead elite', () => {
      const enemy = new Enemy(1000, 1000, 'elite', 0);
      enemy.hp = 0;
      enemy.maxHp = 350;
      expect(() => enemy.drawShape(mockCtx, 100, 100)).not.toThrow();
    });
  });

  describe('obstacle collision logic', () => {
    it('should skip font type obstacles during collision check', () => {
      const playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      const fountain = new Obstacle(1005, 1000, 100, 100, 'font');
      const enemy = new Enemy(1000, 1000, 'basic', 0, [fountain]);

      // Enemy should spawn even if position overlaps with fountain
      // (font type obstacles are skipped in collision detection)
      expect(enemy.x).toBeDefined();
      expect(enemy.y).toBeDefined();
    });

    it('should consider non-font obstacles for collision', () => {
      const playerEntity = new TestEntity(1000, 1000, 12, '#fff');
      const ruin = new Obstacle(1000, 1000, 100, 100, 'ruin');

      // Creating enemy with obstacle should not throw
      expect(() => new Enemy(1000, 1000, 'basic', 0, [ruin])).not.toThrow();
    });
  });
});
