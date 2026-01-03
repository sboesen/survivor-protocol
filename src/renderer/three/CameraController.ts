import * as THREE from 'three';
import { CONFIG } from '../../config';

/**
 * Controls camera position and viewport for the 2D game world.
 * Handles world wrapping visual effects.
 */
export class CameraController {
  private camera: THREE.OrthographicCamera;

  constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera;
  }

  /**
   * Update camera to follow the player
   */
  follow(playerX: number, playerY: number, _screenWidth: number, _screenHeight: number): void {

    // Calculate camera position (centered on player)
    this.camera.position.x = playerX;
    this.camera.position.y = playerY;

    // Handle world wrapping for camera position
    // When player crosses edge, camera should smoothly adjust
    const worldSize = CONFIG.worldSize;

    // Wrap camera position if needed
    if (this.camera.position.x < 0) this.camera.position.x += worldSize;
    if (this.camera.position.x > worldSize) this.camera.position.x -= worldSize;
    if (this.camera.position.y < 0) this.camera.position.y += worldSize;
    if (this.camera.position.y > worldSize) this.camera.position.y -= worldSize;

    this.camera.updateMatrixWorld();
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(wx: number, wy: number, screenWidth: number, screenHeight: number): { x: number; y: number } {
    // Account for camera position and world wrapping
    let dx = wx - this.camera.position.x;
    let dy = wy - this.camera.position.y;

    // Handle wrapping
    const worldSize = CONFIG.worldSize;
    if (dx < -worldSize / 2) dx += worldSize;
    if (dx > worldSize / 2) dx -= worldSize;
    if (dy < -worldSize / 2) dy += worldSize;
    if (dy > worldSize / 2) dy -= worldSize;

    return {
      x: screenWidth / 2 + dx,
      y: screenHeight / 2 - dy,
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
