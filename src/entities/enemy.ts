import { CONFIG } from '../config';
import type { CanvasContext, EntityType } from '../types';
import { Entity } from './entity';
import { Obstacle } from './obstacle';
import { Renderer } from '../systems/renderer';

export class Enemy extends Entity {
  type: EntityType;
  maxHp: number;
  speed: number;
  sprite: EntityType;
  xp: number;
  flash: number;
  shootTimer: number;

  constructor(
    px: number,
    py: number,
    type: EntityType,
    mins: number,
    obstacles: Obstacle[] = []
  ) {
    // Spawn at random angle and distance, avoiding obstacles
    let ang: number;
    let dist = 600;
    let sx: number;
    let sy: number;
    let attempts = 0;
    const maxAttempts = 20;

    do {
      ang = Math.random() * 6.28;
      sx = px + Math.cos(ang) * dist;
      sy = py + Math.sin(ang) * dist;

      // Wrap to world bounds
      if (sx < 0) sx += CONFIG.worldSize;
      if (sx > CONFIG.worldSize) sx -= CONFIG.worldSize;
      if (sy < 0) sy += CONFIG.worldSize;
      if (sy > CONFIG.worldSize) sy -= CONFIG.worldSize;

      attempts++;
    } while (attempts < maxAttempts && Enemy.isInsideObstacle(sx, sy, obstacles));

    let radius = 10;
    let hp = 15;
    let sprite: EntityType = 'basic';
    let color = '#fff';
    let baseSpeed = 0.8 + Math.random() * 0.3; // Lower base speed
    let xp = 1;

    switch (type) {
      case 'elite':
        hp = 100 + mins * 50;
        radius = 18;
        sprite = 'elite';
        color = '#a855f7';
        baseSpeed = 0.6 + Math.random() * 0.2;
        xp = 20;
        break;
      case 'boss':
        hp = 1000 + mins * 200;
        radius = 25;
        sprite = 'boss';
        color = '#dc2626';
        baseSpeed = 0.7; // Slower boss
        xp = 200;
        break;
      case 'bat':
        hp = 8;
        radius = 8;
        sprite = 'bat';
        color = '#777';
        baseSpeed = 1.8 + Math.random() * 0.4;
        xp = 1;
        break;
      default:
        hp = 15 + mins * 10;
    }

    // Scale speed with time (max 2x faster at 10 minutes)
    const timeScale = 1 + (mins * 0.1);
    const speed = Math.min(baseSpeed * timeScale, 3.0);

    super(sx, sy, radius, color);

    this.type = type;
    this.maxHp = hp;
    this.hp = hp;
    this.speed = speed;
    this.sprite = sprite;
    this.xp = xp;
    this.flash = 0;
    this.shootTimer = 0;
  }

  get hp(): number { return this._hp; }
  set hp(value: number) { this._hp = Math.max(0, value); }
  private _hp: number = 15;

  private static isInsideObstacle(x: number, y: number, obstacles: Obstacle[]): boolean {
    for (const o of obstacles) {
      if (o.type === 'font') continue; // Skip healing fountains
      const dist = Math.hypot(x - o.x, y - o.y);
      if (dist < 80) {
        // Check if position is inside obstacle bounds (with margin)
        const margin = 30;
        if (x > o.x - o.w / 2 - margin && x < o.x + o.w / 2 + margin &&
            y > o.y - o.h / 2 - margin && y < o.y + o.h / 2 + margin) {
          return true;
        }
      }
    }
    return false;
  }

  update(player: Entity, timeFreeze: number, obstacles: Obstacle[] = []): void {
    if (timeFreeze > 0) return;

    let dx = player.x - this.x;
    let dy = player.y - this.y;

    // Handle world wrapping for movement
    if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
    if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
    if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
    if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;

    const ang = Math.atan2(dy, dx);

    // Try multiple movement directions for better pathfinding
    const moveAttempts = [
      { angle: ang, weight: 1.0 },           // Direct path to player
      { angle: ang + 0.5, weight: 0.7 },     // 30 degrees right
      { angle: ang - 0.5, weight: 0.7 },     // 30 degrees left
      { angle: ang + 1.2, weight: 0.4 },     // ~70 degrees right
      { angle: ang - 1.2, weight: 0.4 },     // ~70 degrees left
    ];

    for (const attempt of moveAttempts) {
      const testX = (this.x + Math.cos(attempt.angle) * this.speed + CONFIG.worldSize) % CONFIG.worldSize;
      const testY = (this.y + Math.sin(attempt.angle) * this.speed + CONFIG.worldSize) % CONFIG.worldSize;

      // Check obstacle collision
      let blocked = false;
      for (const o of obstacles) {
        if (o.type === 'font') continue; // Skip healing fountains
        const dist = Math.hypot(testX - o.x, testY - o.y);
        if (dist < 80) {
          // Check if new position would be inside obstacle
          if (testX > o.x - o.w / 2 - this.radius && testX < o.x + o.w / 2 + this.radius &&
              testY > o.y - o.h / 2 - this.radius && testY < o.y + o.h / 2 + this.radius) {
            blocked = true;
            break;
          }
        }
      }

      if (!blocked) {
        // Also check if this direction gets us closer to player than current position
        const currentDist = Math.hypot(dx, dy);
        const newDistToPlayer = Math.hypot(player.x - testX, player.y - testY);
        // Handle wrap for distance check
        let wrappedNewDist = newDistToPlayer;
        if (player.x - testX > CONFIG.worldSize / 2) wrappedNewDist = Math.hypot(player.x - testX - CONFIG.worldSize, player.y - testY);
        if (player.x - testX < -CONFIG.worldSize / 2) wrappedNewDist = Math.hypot(player.x - testX + CONFIG.worldSize, player.y - testY);
        if (player.y - testY > CONFIG.worldSize / 2) wrappedNewDist = Math.hypot(player.x - testX, player.y - testY - CONFIG.worldSize);
        if (player.y - testY < -CONFIG.worldSize / 2) wrappedNewDist = Math.hypot(player.x - testX, player.y - testY + CONFIG.worldSize);

        // Move if this is the primary direction OR if it doesn't take us further from player
        if (attempt.weight >= 1.0 || wrappedNewDist < currentDist + this.speed * 1.5) {
          this.x = testX;
          this.y = testY;
          break;
        }
      }
    }

    if (this.flash > 0) this.flash--;

    // Boss projectile attack
    if (this.type === 'boss') {
      this.shootTimer++;
      if (this.shootTimer > 90) {
        this.shootTimer = 0;
        // Note: projectiles are managed by the game, not here
        // This is tracked for visual/game timing purposes
      }
    }
  }

  drawShape(ctx: CanvasContext, x: number, y: number): void {

    const spriteMap: Record<EntityType, 'shopper' | 'sprinter' | 'armored' | 'manager'> = {
      basic: 'shopper',
      bat: 'sprinter',
      elite: 'armored',
      boss: 'manager'
    };

    const scale = this.type === 'boss' ? 4 : (this.type === 'elite' ? 3 : 2);
    Renderer.drawSprite(ctx, spriteMap[this.sprite], x, y, scale);

    // Flash effect
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // Health bar for elite and boss
    if (this.type === 'elite' || this.type === 'boss') {
      ctx.fillStyle = 'red';
      ctx.fillRect(x - 15, y - 35, 30, 4);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(x - 15, y - 35, 30 * (this.hp / this.maxHp), 4);
    }
  }
}
