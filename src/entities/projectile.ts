import { CONFIG } from '../config';
import type { CanvasContext } from '../types';
import { Entity } from './entity';

export class Projectile extends Entity {
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  dmg: number;
  dur: number;
  pierce: number;
  isCrit: boolean;
  isHostile: boolean;
  hitList: Entity[];
  isArc: boolean;
  isBubble: boolean;
  rot: number;
  wobble: number;
  age: number;
  explodeRadius?: number;
  knockback?: number;
  splits?: boolean;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    color: string,
    dmg: number,
    dur: number,
    pierce: number,
    isCrit: boolean,
    isHostile: boolean = false
  ) {
    super(x, y, radius, color);
    this.baseVx = vx;
    this.baseVy = vy;
    this.vx = vx;
    this.vy = vy;
    this.dmg = dmg;
    this.dur = dur;
    this.pierce = pierce;
    this.isCrit = isCrit;
    this.isHostile = isHostile;
    this.hitList = [];
    this.isArc = false;
    this.isBubble = false;
    this.rot = 0;
    this.wobble = Math.random() * Math.PI * 2;
    this.age = 0;
  }

  update(): void {
    this.age++;

    if (this.isBubble) {
      // Wavy motion: add perpendicular sine wave
      const perpX = -this.baseVy;
      const perpY = this.baseVx;
      const wobbleAmount = Math.sin(this.age * 0.3 + this.wobble) * 2;
      this.vx = this.baseVx + perpX * wobbleAmount * 0.1;
      this.vy = this.baseVy + perpY * wobbleAmount * 0.1;
    }

    this.x = (this.x + this.vx + CONFIG.worldSize) % CONFIG.worldSize;
    this.y = (this.y + this.vy + CONFIG.worldSize) % CONFIG.worldSize;

    if (this.isArc) {
      this.vy += 0.25;
      this.rot += 0.3;
    }

    this.dur--;
    if (this.dur <= 0) this.marked = true;
  }

  drawShape(ctx: CanvasContext, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    if (this.isArc) ctx.rotate(this.rot);

    ctx.fillStyle = this.isCrit ? '#ff0' : this.color;

    if (this.isArc) {
      ctx.fillRect(-6, -6, 12, 12);
    } else if (this.isBubble) {
      // Draw bubble with shine
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 240, 255, 0.3)';
      ctx.fill();
      // Shine
      ctx.beginPath();
      ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
