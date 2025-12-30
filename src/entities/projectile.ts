import { CONFIG } from '../config';
import type { CanvasContext } from '../types';
import { Entity } from './entity';

export class Projectile extends Entity {
  vx: number;
  vy: number;
  dmg: number;
  dur: number;
  pierce: number;
  isCrit: boolean;
  isHostile: boolean;
  hitList: Entity[];
  isArc: boolean;
  rot: number;

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
    this.vx = vx;
    this.vy = vy;
    this.dmg = dmg;
    this.dur = dur;
    this.pierce = pierce;
    this.isCrit = isCrit;
    this.isHostile = isHostile;
    this.hitList = [];
    this.isArc = false;
    this.rot = 0;
  }

  update(): void {
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
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
