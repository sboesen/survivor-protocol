import { wrapRelativePosition } from '../systems/movement';
import type { CanvasContext } from '../types';

/**
 * Branded type for screen coordinates that have been properly wrapped.
 * Can only be created through Entity.getWrappedScreenPosition().
 * This prevents rendering with raw world coordinates.
 */
export interface ScreenPosition {
  readonly __brand: 'ScreenPosition';
  readonly sx: number;
  readonly sy: number;
}

/**
 * Branded type for wrapped relative offsets.
 * Can only be created through Entity.getWrappedOffset().
 */
export interface WrappedOffset {
  readonly __brand: 'WrappedOffset';
  readonly rx: number;
  readonly ry: number;
}

/**
 * Base class for all game entities.
 * Provides world wrapping for rendering and common drawing logic.
 *
 * Enforces that rendering uses properly wrapped coordinates through branded types.
 */
export abstract class Entity {
  marked: boolean = false;

  constructor(
    public x: number,
    public y: number,
    public radius: number,
    public color: string
  ) {}

  /**
   * Get wrapped screen position for rendering.
   * Returns a branded ScreenPosition type that can only be used with drawShape().
   *
   * @param px - Player/camera X position
   * @param py - Player/camera Y position
   * @param cw - Canvas width
   * @param ch - Canvas height
   * @param cullMargin - Extra margin for culling (default 50)
   * @returns ScreenPosition (branded type), or null if culled
   */
  protected getWrappedScreenPosition(
    px: number,
    py: number,
    cw: number,
    ch: number,
    cullMargin = 50
  ): ScreenPosition | null {
    const rx = wrapRelativePosition(this.x - px);
    const ry = wrapRelativePosition(this.y - py);

    const sx = rx + cw / 2;
    const sy = ry + ch / 2;

    // Culling
    if (sx < -cullMargin || sx > cw + cullMargin || sy < -cullMargin || sy > ch + cullMargin) {
      return null;
    }

    // Return branded type - cannot be constructed elsewhere
    return { sx, sy } as ScreenPosition;
  }

  /**
   * Get wrapped relative offset from player/camera.
   * Returns a branded WrappedOffset type for effects that need raw offsets.
   *
   * @param px - Player/camera X position
   * @param py - Player/camera Y position
   * @returns WrappedOffset (branded type)
   */
  protected getWrappedOffset(px: number, py: number): WrappedOffset {
    return {
      rx: wrapRelativePosition(this.x - px),
      ry: wrapRelativePosition(this.y - py),
    } as WrappedOffset;
  }

  draw(
    ctx: CanvasContext,
    px: number,
    py: number,
    cw: number,
    ch: number
  ): void {
    const pos = this.getWrappedScreenPosition(px, py, cw, ch);
    if (!pos) return;

    this.drawShape(ctx, pos);
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

  /**
   * Draw the entity's shape.
   * Only receives wrapped ScreenPosition, preventing accidental use of raw coordinates.
   */
  protected abstract drawShape(ctx: CanvasContext, pos: ScreenPosition): void;
}
