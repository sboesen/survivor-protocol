import * as THREE from 'three';
import { CONFIG } from '../../config';

/**
 * Controls camera position and viewport for the 2D game world.
 * Handles world wrapping visual effects.
 */
export class CameraController {
  private camera: THREE.OrthographicCamera;
  private target = new THREE.Vector3();
  private pixelSize = 1;

  constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera;
  }

  /**
    * Update camera to follow the player.
    * Camera position stays wrapped to [0, worldSize] to match entities.
    */
  follow(playerX: number, playerY: number, screenWidth: number, screenHeight: number): void {
    // Wrap camera position to match entity coordinate space
    const wrappedX = ((playerX % CONFIG.worldSize) + CONFIG.worldSize) % CONFIG.worldSize;
    const wrappedY = ((playerY % CONFIG.worldSize) + CONFIG.worldSize) % CONFIG.worldSize;

    const verticalSpan = this.camera.top - this.camera.bottom;
    const horizontalSpan = this.camera.right - this.camera.left;
    const pixelSize = screenHeight > 0
      ? verticalSpan / screenHeight
      : horizontalSpan / Math.max(1, screenWidth);
    this.pixelSize = pixelSize > 0 ? pixelSize : 1;
    const snappedX = this.snapToPixel(wrappedX);
    const snappedY = this.snapToPixel(wrappedY);
    const finalX = ((snappedX % CONFIG.worldSize) + CONFIG.worldSize) % CONFIG.worldSize;
    const finalY = ((snappedY % CONFIG.worldSize) + CONFIG.worldSize) % CONFIG.worldSize;

    this.camera.position.set(finalX, finalY, 100);
    this.target.set(finalX, finalY, 0);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  private snapToPixel(value: number): number {
    if (!isFinite(this.pixelSize) || this.pixelSize <= 0) return value;
    return Math.round(value / this.pixelSize) * this.pixelSize;
  }

  /**
   * Get the wrapped position for rendering an entity.
   * Returns the position where an entity should appear given current camera position.
   *
   * Example: If camera is at x=1900 and entity is at x=100,
   * the wrapped position is x=2100 (appears to the right of camera).
   */
  getWrappedRenderPosition(entityX: number, entityY: number): { x: number; y: number } {
    let dx = entityX - this.camera.position.x;
    let dy = entityY - this.camera.position.y;

    // Normalize to shortest path (handles toroidal world)
    if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
    if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
    if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;
    if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;

    const x = dx + this.camera.position.x;
    const y = dy + this.camera.position.y;
    return { x: this.snapToPixel(x), y: this.snapToPixel(y) };
  }

  /**
   * Get the relative offset from camera to entity (for screen space rendering).
   * Returns offset normalized to [-worldSize/2, worldSize/2].
   */
  getWrappedOffset(entityX: number, entityY: number): { dx: number; dy: number } {
    let dx = entityX - this.camera.position.x;
    let dy = entityY - this.camera.position.y;

    if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
    if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
    if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;
    if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;

    return { dx, dy };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(wx: number, wy: number, screenWidth: number, screenHeight: number): { x: number; y: number } {
    const offset = this.getWrappedOffset(wx, wy);
    return {
      x: Math.round(screenWidth / 2 + offset.dx),
      y: Math.round(screenHeight / 2 - offset.dy),
    };
  }

  /**
   * Get the visible world bounds
   */
  getVisibleBounds(): { left: number; right: number; top: number; bottom: number } {
    const halfWidth = (this.camera.right - this.camera.left) / 2;
    const halfHeight = (this.camera.top - this.camera.bottom) / 2;

    return {
      left: this.camera.position.x - halfWidth,
      right: this.camera.position.x + halfWidth,
      top: this.camera.position.y + halfHeight,
      bottom: this.camera.position.y - halfHeight,
    };
  }

  /**
   * Check if a world position is visible on screen
   */
  isPositionVisible(wx: number, wy: number): boolean {
    const bounds = this.getVisibleBounds();
    return wx >= bounds.left && wx <= bounds.right &&
           wy >= bounds.bottom && wy <= bounds.top;
  }
}
