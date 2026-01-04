import { CONFIG } from '../config';
import type { CanvasContext } from '../types';
import { Entity, type ScreenPosition } from './entity';
import { Renderer } from '../systems/renderer';

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
  weaponId: string; // Track which weapon created this projectile
  spriteId?: string; // Use sprite instead of circle

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
    isHostile: boolean = false,
    weaponId: string = ''
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
    this.weaponId = weaponId;
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

  drawShape(ctx: CanvasContext, pos: ScreenPosition): void {
    const { sx, sy } = pos;
    ctx.save();
    ctx.translate(sx, sy);
    if (this.isArc) ctx.rotate(this.rot);

    // Fade out near end of life
    const alpha = this.dur < 5 ? this.dur / 5 : 1;
    ctx.globalAlpha = alpha;

    // Draw sprite if specified
    if (this.spriteId) {
      ctx.drawImage(
        Renderer.getLoadedImage(this.spriteId),
        -8, -8, 16, 16
      );
    } else if (this.isArc) {
      ctx.fillStyle = this.isCrit ? '#ff0' : this.color;
      ctx.fillRect(-6, -6, 12, 12);
    } else if (this.isBubble) {
      // Draw bubble with shimmering rings and inner glow
      const pulse = Math.sin(this.age * 0.2) * 0.1 + 1; // Subtle pulse

      // Outer ring with glow
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.6 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(170, 221, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Main bubble body
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.3 * pulse, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, 0, 0, 0, this.radius * 1.5);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      gradient.addColorStop(0.5, 'rgba(170, 221, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(100, 180, 255, 0.1)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Inner ring
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.8 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 240, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Multiple shine spots for iridescent effect
      ctx.beginPath();
      ctx.arc(-this.radius * 0.4, -this.radius * 0.4, this.radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.radius * 0.3, this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 240, 255, 0.4)';
      ctx.fill();

      // Wobble highlight
      const wobbleX = Math.sin(this.age * 0.15 + this.wobble) * this.radius * 0.3;
      const wobbleY = Math.cos(this.age * 0.12 + this.wobble) * this.radius * 0.2;
      ctx.beginPath();
      ctx.arc(wobbleX, wobbleY, this.radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
    } else {
      ctx.fillStyle = this.isCrit ? '#ff0' : this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
