import type { CanvasContext } from '../types';
import { Entity, type ScreenPosition } from './entity';

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

  drawShape(ctx: CanvasContext, pos: ScreenPosition): void {
    const { sx, sy } = pos;
    // Use a time-based animation that works independently
    const time = Date.now() / 200;
    const oy = Math.sin((time + this.bob) * 0.5) * 3;

    if (this.type === 'chest') {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(sx - 10, sy - 8 + oy, 20, 16);
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 10, sy - 8 + oy, 20, 16);
    } else if (this.type === 'heart') {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(sx, sy + oy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '8px Arial';
      ctx.fillText('+', sx - 3, sy + 3 + oy);
    } else {
      ctx.beginPath();
      ctx.moveTo(sx, sy - 5 + oy);
      ctx.lineTo(sx + 4, sy + oy);
      ctx.lineTo(sx, sy + 5 + oy);
      ctx.lineTo(sx - 4, sy + oy);
      ctx.fillStyle = '#10b981';
      ctx.fill();
    }
  }
}
