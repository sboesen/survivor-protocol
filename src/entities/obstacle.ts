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
      // Base pool
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(x, y + 10, 25, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Water
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.ellipse(x, y + 10, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fountain pillar
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x - 8, y - 15, 16, 25);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 6, y - 15, 12, 25);

      // Top basin
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(x, y - 15, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.ellipse(x, y - 15, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing water spout
      const pulse = Math.sin(Date.now() * 0.005) * 3;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y - 25 - pulse, 4 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Water droplets
      const dropOffset = (Date.now() / 50) % 20;
      ctx.fillStyle = '#38bdf8';
      for (let i = 0; i < 3; i++) {
        const dy = ((dropOffset + i * 7) % 20) - 5;
        const dx = Math.sin(dy * 0.5) * 3;
        const size = 2 - (dy + 5) / 10;
        if (size > 0) {
          ctx.beginPath();
          ctx.arc(x + dx, y - 20 + dy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - this.w / 2, y - this.h / 2, this.w, this.h);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - this.w / 2, y - this.h / 2 - 15, this.w, 15);
    }
  }
}
