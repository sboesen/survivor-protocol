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
      // Industrial ruin with pixel art details
      const hw = this.w / 2;
      const hh = this.h / 2;

      // Main structure - metal base
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - hw, y - hh, this.w, this.h);

      // Top highlight (metal edge)
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - hw, y - hh, this.w, 4);

      // Bottom shadow
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - hw, y + hh - 4, this.w, 4);

      // Vertical panel lines
      ctx.fillStyle = '#1e293b';
      for (let px = -hw + 15; px < hw - 10; px += 25) {
        ctx.fillRect(x + px, y - hh + 4, 2, this.h - 8);
      }

      // Horizontal panel line (middle)
      ctx.fillRect(x - hw + 4, y - 4, this.w - 8, 2);

      // Rivets/bolts at corners and along edges
      ctx.fillStyle = '#64748b';
      const rivetPositions = [
        [-hw + 6, -hh + 6], [hw - 6, -hh + 6],
        [-hw + 6, hh - 6], [hw - 6, hh - 6],
        [0, -hh + 6], [0, hh - 6],
      ];

      rivetPositions.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(x + rx, y + ry, 3, 0, Math.PI * 2);
        ctx.fill();
        // Rivet highlight
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(x + rx - 1, y + ry - 1, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
      });

      // Vent/grate in center if large enough
      if (this.w > 60 && this.h > 60) {
        ctx.fillStyle = '#0f172a';
        const ventW = 20;
        const ventH = 30;
        ctx.fillRect(x - ventW/2, y - ventH/2, ventW, ventH);

        // Vent slats
        ctx.fillStyle = '#334155';
        for (let vy = -10; vy <= 10; vy += 6) {
          ctx.fillRect(x - ventW/2 + 2, y + vy - 1, ventW - 4, 2);
        }
      }

      // Warning stripe accent (bottom)
      ctx.fillStyle = '#f59e0b';
      const stripeY = y + hh - 12;
      for (let sx = -hw + 4; sx < hw - 4; sx += 16) {
        ctx.beginPath();
        ctx.moveTo(x + sx, stripeY);
        ctx.lineTo(x + sx + 8, stripeY + 8);
        ctx.lineTo(x + sx + 6, stripeY + 8);
        ctx.lineTo(x + sx - 2, stripeY);
        ctx.fill();
      }

      // Damage/weathering dots (random but consistent based on position)
      ctx.fillStyle = '#1e293b';
      const seed = Math.floor(x * y) % 10;
      for (let i = 0; i < 5; i++) {
        const dx = ((seed + i * 37) % (this.w - 20)) - this.w / 2 + 10;
        const dy = ((seed + i * 53) % (this.h - 20)) - this.h / 2 + 10;
        ctx.fillRect(x + dx, y + dy, 2, 2);
      }
    }
  }
}
