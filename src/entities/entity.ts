import { CONFIG } from '../config';
import type { CanvasContext } from '../types';

export abstract class Entity {
  marked: boolean = false;

  constructor(
    public x: number,
    public y: number,
    public radius: number,
    public color: string
  ) {}

  draw(
    ctx: CanvasContext,
    px: number,
    py: number,
    cw: number,
    ch: number
  ): void {
    let rx = this.x - px;
    let ry = this.y - py;

    // Handle world wrapping for rendering
    if (rx < -CONFIG.worldSize / 2) rx += CONFIG.worldSize;
    if (rx > CONFIG.worldSize / 2) rx -= CONFIG.worldSize;
    if (ry < -CONFIG.worldSize / 2) ry += CONFIG.worldSize;
    if (ry > CONFIG.worldSize / 2) ry -= CONFIG.worldSize;

    const sx = rx + cw / 2;
    const sy = ry + ch / 2;

    // Culling
    if (sx < -50 || sx > cw + 50 || sy < -50 || sy > ch + 50) return;

    this.drawShape(ctx, sx, sy);
  }

  /**
   * Draw ground illumination for light-emitting entities.
   * Default implementation does nothing. Override in subclasses.
   */
  drawIllumination(
    _ctx: CanvasContext,
    _px: number,
    _py: number,
    _cw: number,
    _ch: number
  ): void {
    // Default: no illumination
  }

  abstract drawShape(ctx: CanvasContext, x: number, y: number): void;
}
