import { PALETTE } from '../assets/palette';
import { SPRITES } from '../assets/sprites';
import type { CanvasContext, Palette as PaletteType } from '../types';

class RendererSystem {
  drawSprite(
    ctx: CanvasContext,
    spriteKey: string,
    x: number,
    y: number,
    scale: number,
    opacity = 1,
    shadow = true
  ): void {
    const art = SPRITES[spriteKey];
    if (!art) return;

    // Draw shadow
    if (shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(x, y + scale * 4, scale * 4, scale * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const size = 10;
    const startX = x - (size * scale) / 2;
    const startY = y - (size * scale) / 2;
    ctx.globalAlpha = opacity;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const char = art[py]?.[px] as keyof PaletteType;
        const color = char !== undefined ? PALETTE[char] : undefined;
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(startX + px * scale, startY + py * scale, scale, scale);
        }
      }
    }

    ctx.globalAlpha = 1.0;
  }
}

export const Renderer = new RendererSystem();
