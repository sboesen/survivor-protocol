import type { CanvasContext } from '../types';
import { Entity } from './entity';

export class Obstacle extends Entity {
  w: number;
  h: number;
  type: 'ruin' | 'font';

  constructor(x: number, y: number, w: number, h: number, type: 'ruin' | 'font') {
    super(x, y, 0, '#000');
    this.w = w;
    this.h = h;
    this.type = type;
  }

  drawShape(ctx: CanvasContext, x: number, y: number): void {
    if (this.type === 'font') {
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(x - 20, y - 20, 40, 40);
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(x, y, 10 + Math.sin(Date.now() * 0.003) * 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - this.w / 2, y - this.h / 2, this.w, this.h);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - this.w / 2, y - this.h / 2 - 15, this.w, 15);
    }
  }
}
