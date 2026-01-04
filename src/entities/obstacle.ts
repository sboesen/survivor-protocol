import type { CanvasContext } from '../types';
import { Entity, type ScreenPosition } from './entity';

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

  drawShape(ctx: CanvasContext, pos: ScreenPosition): void {
    const { sx, sy } = pos;
    if (this.type === 'font') {
      // Base pool
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 10, 25, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Water
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 10, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fountain pillar
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(sx - 8, sy - 15, 16, 25);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(sx - 6, sy - 15, 12, 25);

      // Top basin
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 15, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 15, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing water spout
      const pulse = Math.sin(Date.now() * 0.005) * 3;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.6)';
      ctx.beginPath();
      ctx.arc(sx, sy - 25 - pulse, 4 + pulse, 0, Math.PI * 2);
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
          ctx.arc(sx + dx, sy - 20 + dy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Industrial ruin with pixel art details
      const hw = this.w / 2;
      const hh = this.h / 2;

      // Main structure - metal base
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx - hw, sy - hh, this.w, this.h);

      // Top highlight (metal edge)
      ctx.fillStyle = '#475569';
      ctx.fillRect(sx - hw, sy - hh, this.w, 4);

      // Bottom shadow
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sx - hw, sy + hh - 4, this.w, 4);

      // Vertical panel lines
      ctx.fillStyle = '#1e293b';
      for (let panelX = -hw + 15; panelX < hw - 10; panelX += 25) {
        ctx.fillRect(sx + panelX, sy - hh + 4, 2, this.h - 8);
      }

      // Horizontal panel line (middle)
      ctx.fillRect(sx - hw + 4, sy - 4, this.w - 8, 2);

      // Rivets/bolts at corners and along edges
      ctx.fillStyle = '#64748b';
      const rivetPositions = [
        [-hw + 6, -hh + 6], [hw - 6, -hh + 6],
        [-hw + 6, hh - 6], [hw - 6, hh - 6],
        [0, -hh + 6], [0, hh - 6],
      ];

      rivetPositions.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(sx + rx, sy + ry, 3, 0, Math.PI * 2);
        ctx.fill();
        // Rivet highlight
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(sx + rx - 1, sy + ry - 1, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
      });

      // Vent/grate in center if large enough
      if (this.w > 60 && this.h > 60) {
        ctx.fillStyle = '#0f172a';
        const ventW = 20;
        const ventH = 30;
        ctx.fillRect(sx - ventW/2, sy - ventH/2, ventW, ventH);

        // Vent slats
        ctx.fillStyle = '#334155';
        for (let vy = -10; vy <= 10; vy += 6) {
          ctx.fillRect(sx - ventW/2 + 2, sy + vy - 1, ventW - 4, 2);
        }
      }

      // Warning stripe accent (bottom)
      ctx.fillStyle = '#f59e0b';
      const stripeY = sy + hh - 12;
      for (let stripeX = -hw + 4; stripeX < hw - 4; stripeX += 16) {
        ctx.beginPath();
        ctx.moveTo(sx + stripeX, stripeY);
        ctx.lineTo(sx + stripeX + 8, stripeY + 8);
        ctx.lineTo(sx + stripeX + 6, stripeY + 8);
        ctx.lineTo(sx + stripeX - 2, stripeY);
        ctx.fill();
      }

      // Damage/weathering dots (random but consistent based on position)
      ctx.fillStyle = '#1e293b';
      const seed = Math.floor(sx * sy) % 10;
      for (let i = 0; i < 5; i++) {
        const dx = ((seed + i * 37) % (this.w - 20)) - this.w / 2 + 10;
        const dy = ((seed + i * 53) % (this.h - 20)) - this.h / 2 + 10;
        ctx.fillRect(sx + dx, sy + dy, 2, 2);
      }
    }
  }
}
