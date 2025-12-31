import type { CanvasContext } from '../types';
import { Entity } from './entity';

export class Loot extends Entity {
  type: 'gem' | 'chest' | 'heart';
  val: number;
  bob: number;

  constructor(x: number, y: number, type: 'gem' | 'chest' | 'heart') {
    super(x, y, 8, '#000');
    this.type = type;
    this.val = 1;
    this.bob = Math.random() * 10;
  }

  drawShape(ctx: CanvasContext, x: number, y: number): void {
    // Use a time-based animation that works independently
    const time = Date.now() / 200;
    const oy = Math.sin((time + this.bob) * 0.5) * 3;

    if (this.type === 'chest') {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(x - 10, y - 8 + oy, 20, 16);
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 10, y - 8 + oy, 20, 16);
    } else if (this.type === 'heart') {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(x, y + oy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '8px Arial';
      ctx.fillText('+', x - 3, y + 3 + oy);
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - 5 + oy);
      ctx.lineTo(x + 4, y + oy);
      ctx.lineTo(x, y + 5 + oy);
      ctx.lineTo(x - 4, y + oy);
      ctx.fillStyle = '#10b981';
      ctx.fill();
    }
  }
}
