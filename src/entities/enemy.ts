import { CONFIG } from '../config';
import type { CanvasContext, EntityType } from '../types';
import { Entity, type ScreenPosition } from './entity';
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

  // Pathfinding state: commitment to a sliding direction
  private slideDirection: -1 | 0 | 1 = 0; // -1 = left, 0 = none, 1 = right

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

    // Direction to player
    let dx = player.x - this.x;
    let dy = player.y - this.y;

    // Handle world wrapping for movement
    if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
    if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
    if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
    if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;

    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    // Normalize direction
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Try moving toward player with wall sliding
    this.moveWithSliding(dirX, dirY, obstacles, player);

    if (this.flash > 0) this.flash--;

    // Boss projectile attack
    if (this.type === 'boss') {
      this.shootTimer++;
      if (this.shootTimer > 90) {
        this.shootTimer = 0;
      }
    }
  }

  private moveWithSliding(dirX: number, dirY: number, obstacles: Obstacle[], player: Entity): void {
    // Calculate perpendicular directions (90° left and right of intended direction)
    const leftX = -dirY;
    const leftY = dirX;
    const rightX = dirY;
    const rightY = -dirX;

    // Try direct movement first
    const directX = (this.x + dirX * this.speed + CONFIG.worldSize) % CONFIG.worldSize;
    const directY = (this.y + dirY * this.speed + CONFIG.worldSize) % CONFIG.worldSize;

    if (!this.collidesWithObstacle(directX, directY, obstacles)) {
      // Direct path is clear - move and reset commitment
      this.x = directX;
      this.y = directY;
      this.slideDirection = 0;
      return;
    }

    // Direct path blocked - use sliding
    // If we're already committed to a direction, keep using it
    if (this.slideDirection !== 0) {
      const slideX = this.slideDirection === -1 ? leftX : rightX;
      const slideY = this.slideDirection === -1 ? leftY : rightY;

      const tryX = (this.x + slideX * this.speed + CONFIG.worldSize) % CONFIG.worldSize;
      const tryY = (this.y + slideY * this.speed + CONFIG.worldSize) % CONFIG.worldSize;

      if (!this.collidesWithObstacle(tryX, tryY, obstacles)) {
        this.x = tryX;
        this.y = tryY;
        return;
      }
      // Committed direction is blocked too - try the opposite direction
      const oppX = this.slideDirection === -1 ? rightX : leftX;
      const oppY = this.slideDirection === -1 ? rightY : leftY;
      const oppTryX = (this.x + oppX * this.speed + CONFIG.worldSize) % CONFIG.worldSize;
      const oppTryY = (this.y + oppY * this.speed + CONFIG.worldSize) % CONFIG.worldSize;

      if (!this.collidesWithObstacle(oppTryX, oppTryY, obstacles)) {
        this.x = oppTryX;
        this.y = oppTryY;
        this.slideDirection = this.slideDirection === -1 ? 1 : -1; // Switch commitment
        return;
      }
      // Both blocked - we're stuck, don't move
      return;
    }

    // No commitment yet - evaluate both perpendicular directions
    const leftTryX = (this.x + leftX * this.speed + CONFIG.worldSize) % CONFIG.worldSize;
    const leftTryY = (this.y + leftY * this.speed + CONFIG.worldSize) % CONFIG.worldSize;
    const rightTryX = (this.x + rightX * this.speed + CONFIG.worldSize) % CONFIG.worldSize;
    const rightTryY = (this.y + rightY * this.speed + CONFIG.worldSize) % CONFIG.worldSize;

    const leftValid = !this.collidesWithObstacle(leftTryX, leftTryY, obstacles);
    const rightValid = !this.collidesWithObstacle(rightTryX, rightTryY, obstacles);

    if (!leftValid && !rightValid) {
      // Completely stuck - don't move this frame
      return;
    }

    // Calculate distance to actual player from each slide position
    const distToPlayer = (x: number, y: number): number => {
      let dx = player.x - x;
      let dy = player.y - y;
      // Handle world wrapping
      if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
      if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
      if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
      if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;
      return dx * dx + dy * dy;
    };

    const leftDist = leftValid ? distToPlayer(leftTryX, leftTryY) : Infinity;
    const rightDist = rightValid ? distToPlayer(rightTryX, rightTryY) : Infinity;

    // Pick the direction that gets us closer to the player and COMMIT to it
    if (leftDist <= rightDist && leftValid) {
      this.x = leftTryX;
      this.y = leftTryY;
      this.slideDirection = -1;
    } else if (rightValid) {
      this.x = rightTryX;
      this.y = rightTryY;
      this.slideDirection = 1;
    }
  }

  private collidesWithObstacle(x: number, y: number, obstacles: Obstacle[]): boolean {
    for (const o of obstacles) {
      if (o.type === 'font') continue; // Skip healing fountains
      const dist = Math.hypot(x - o.x, y - o.y);
      if (dist < 80) {
        if (x > o.x - o.w / 2 - this.radius && x < o.x + o.w / 2 + this.radius &&
          y > o.y - o.h / 2 - this.radius && y < o.y + o.h / 2 + this.radius) {
          return true;
        }
      }
    }
    return false;
  }

  drawShape(ctx: CanvasContext, pos: ScreenPosition): void {
    const { sx, sy } = pos;

    const spriteMap: Record<EntityType, 'shopper' | 'sprinter' | 'armored' | 'manager'> = {
      basic: 'shopper',
      bat: 'sprinter',
      elite: 'armored',
      boss: 'manager'
    };

    const scale = this.type === 'boss' ? 4 : (this.type === 'elite' ? 3 : 2);
    Renderer.drawSprite(ctx, spriteMap[this.sprite], sx, sy, scale);

    // Flash effect
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // Health bar for elite and boss
    if (this.type === 'elite' || this.type === 'boss') {
      ctx.fillStyle = 'red';
      ctx.fillRect(sx - 15, sy - 35, 30, 4);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(sx - 15, sy - 35, 30 * (this.hp / this.maxHp), 4);
    }
  }
}
