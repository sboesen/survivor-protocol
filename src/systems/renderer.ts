import { PALETTE } from '../assets/palette';
import { SPRITES } from '../assets/sprites';
import type { CanvasContext, PaletteKey, SpriteKey } from '../types';

/**
 * Type guard to check if a character is a valid palette key.
 */
function isPaletteKey(char: string): char is PaletteKey {
  return char in PALETTE;
}

/**
 * Type guard to check if a key is a valid sprite key.
 */
function isSpriteKey(key: string): key is SpriteKey {
  return key in SPRITES;
}

/**
 * Minimal 2D canvas renderer for gacha and UI elements.
 * Main game uses Three.js renderer.
 */
class RendererSystem {
  private imageCache: Map<string, HTMLImageElement> = new Map();

  drawSprite(
    ctx: CanvasContext,
    spriteKey: string,
    x: number,
    y: number,
    scale: number,
    opacity = 1,
    shadow = true
  ): void {
    if (!isSpriteKey(spriteKey)) {
      console.warn(`[Renderer] Invalid sprite key: '${spriteKey}'`);
      return;
    }

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
        const char = art[py]?.[px];
        if (char && isPaletteKey(char)) {
          const color = PALETTE[char];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(startX + px * scale, startY + py * scale, scale, scale);
          }
        } else if (char && char !== '.') {
          console.warn(`[Renderer] Undefined palette color '${char}' in sprite '${spriteKey}' at (${px},${py})`);
        }
      }
    }

    ctx.globalAlpha = 1.0;
  }

  /**
   * Get a cached image for projectile sprites.
   * Returns Image element or a placeholder if not loaded yet.
   */
  getLoadedImage(spriteId: string): HTMLImageElement {
    console.log('[Renderer] getLoadedImage called with spriteId:', spriteId);
    if (!this.imageCache.has(spriteId)) {
      const img = new Image();
      const path = `/src/assets/sprites/${spriteId}.png`;
      console.log('[Renderer] Creating new image at path:', path);
      img.src = path;
      this.imageCache.set(spriteId, img);
    } else {
      console.log('[Renderer] Using cached image');
    }
    const result = this.imageCache.get(spriteId)!;
    console.log('[Renderer] Returning image, complete:', result.complete, 'src:', result.src);
    return result;
  }
}

export const Renderer = new RendererSystem();
  