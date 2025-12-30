import { CONFIG } from '../config';
import type { CanvasContext, EntityType } from '../types';
import { Entity } from './entity';

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
    mins: number
  ) {
    // Spawn at random angle and distance
    const ang = Math.random() * 6.28;
    const dist = 600;
    let sx = px + Math.cos(ang) * dist;
    let sy = py + Math.sin(ang) * dist;

    // Wrap to world bounds
    if (sx < 0) sx += CONFIG.worldSize;
    if (sx > CONFIG.worldSize) sx -= CONFIG.worldSize;
    if (sy < 0) sy += CONFIG.worldSize;
    if (sy > CONFIG.worldSize) sy -= CONFIG.worldSize;

    let radius = 10;
    let hp = 15;
    let sprite: EntityType = 'basic';
    let color = '#fff';
    let speed = 1.5 + Math.random() * 0.5;
    let xp = 1;

    switch (type) {
      case 'elite':
        hp = 100 + mins * 50;
        radius = 18;
        sprite = 'elite';
        color = '#a855f7';
        speed *= 0.7;
        xp = 20;
        break;
      case 'boss':
        hp = 1000 + mins * 200;
        radius = 25;
        sprite = 'boss';
        color = '#dc2626';
        speed = 1.0;
        xp = 200;
        break;
      case 'bat':
        hp = 8;
        radius = 8;
        sprite = 'bat';
        color = '#777';
        speed = 2.5 + Math.random() * 0.5;
        break;
      default:
        hp = 15 + mins * 10;
    }

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

  update(player: Entity, timeFreeze: number): void {
    if (timeFreeze > 0) return;

    let dx = player.x - this.x;
    let dy = player.y - this.y;

    // Handle world wrapping for movement
    if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
    if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
    if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
    if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;

    const ang = Math.atan2(dy, dx);
    this.x = (this.x + Math.cos(ang) * this.speed + CONFIG.worldSize) % CONFIG.worldSize;
    this.y = (this.y + Math.sin(ang) * this.speed + CONFIG.worldSize) % CONFIG.worldSize;

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
    const { Renderer } = require('../systems/renderer');

    const spriteMap: Record<EntityType, 'skeleton' | 'bat' | 'golem' | 'lich'> = {
      basic: 'skeleton',
      bat: 'bat',
      elite: 'golem',
      boss: 'lich'
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
