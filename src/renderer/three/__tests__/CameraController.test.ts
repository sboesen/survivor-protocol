import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../CameraController';
import { CONFIG } from '../../../config';

describe('CameraController - World Wrapping', () => {
  let camera: THREE.OrthographicCamera;
  let controller: CameraController;

  beforeEach(() => {
    camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 1000);
    controller = new CameraController(camera);
  });

  describe('follow - keeps camera wrapped', () => {
    it('should wrap positive positions beyond world size', () => {
      controller.follow(CONFIG.worldSize + 100, 0, 800, 600);
      expect(camera.position.x).toBe(100);
      expect(camera.position.y).toBe(0);
    });

    it('should wrap negative positions', () => {
      controller.follow(-100, CONFIG.worldSize + 50, 800, 600);
      expect(camera.position.x).toBe(CONFIG.worldSize - 100);
      expect(camera.position.y).toBe(50);
    });

    it('should handle multiple world sizes', () => {
      controller.follow(CONFIG.worldSize * 3 + 250, CONFIG.worldSize * 2 - 100, 800, 600);
      expect(camera.position.x).toBe(250);
      expect(camera.position.y).toBe(CONFIG.worldSize - 100);
    });

    it('should pass through positions within world bounds', () => {
      controller.follow(500, 500, 800, 600);
      expect(camera.position.x).toBe(500);
      expect(camera.position.y).toBe(500);
    });
  });

  describe('getWrappedOffset - for screen space rendering', () => {
    const testCases = [
      // cameraX, cameraY, entityX, entityY, expectedDx, expectedDy, description
      [1000, 1000, 1500, 1000, 500, 0, 'entity to the right of camera'],
      [1000, 1000, 500, 1000, -500, 0, 'entity to the left of camera'],
      [1000, 1000, 1000, 1500, 0, 500, 'entity above camera'],
      [1000, 1000, 1000, 500, 0, -500, 'entity below camera'],

      // Edge cases: entity near right edge, camera near left edge
      // dx = 1950 - 100 = 1850, which > 1000, so dx = 1850 - 2000 = -150
      [100, 1000, CONFIG.worldSize - 50, 1000, -150, 0, 'entity at right edge appears left of camera'],
      [100, 1000, CONFIG.worldSize - 50, 1000, -150, 0, 'entity at right edge appears left of camera (same case)'],

      // Edge cases: entity near left edge, camera near right edge
      // dx = 50 - 1900 = -1850, which < -1000, so dx = -1850 + 2000 = 150
      [CONFIG.worldSize - 100, 1000, 50, 1000, 150, 0, 'entity at left edge appears right of camera'],

      // Edge cases: entity near bottom edge, camera near top edge
      // dy = 1950 - 100 = 1850, which > 1000, so dy = 1850 - 2000 = -150
      [1000, 100, 1000, CONFIG.worldSize - 50, 0, -150, 'entity at bottom edge appears above camera'],
      // dy = 50 - 1900 = -1850, which < -1000, so dy = -1850 + 2000 = 150
      [1000, CONFIG.worldSize - 100, 1000, 50, 0, 150, 'entity at top edge appears below camera'],

      // Corner wrapping
      // dx = 1950 - 100 = 1850 -> -150, dy = 1850 -> -150
      [100, 100, CONFIG.worldSize - 50, CONFIG.worldSize - 50, -150, -150, 'entity at corner wraps diagonally'],

      // Same position
      [500, 500, 500, 500, 0, 0, 'entity at same position as camera'],

      // Exact half world size
      [0, 0, CONFIG.worldSize / 2, 0, CONFIG.worldSize / 2, 0, 'entity exactly at half world size (no wrap needed)'],
      [0, 0, -CONFIG.worldSize / 2, 0, -CONFIG.worldSize / 2, 0, 'negative half world size'],
    ] as const;

    for (const [camX, camY, entX, entY, expectedDx, expectedDy, description] of testCases) {
      it(description, () => {
        camera.position.set(camX as number, camY as number, 100);
        const offset = controller.getWrappedOffset(entX as number, entY as number);
        expect(offset.dx).toBeCloseTo(expectedDx as number, 0.1);
        expect(offset.dy).toBeCloseTo(expectedDy as number, 0.1);
      });
    }

    it('should always return offset in [-worldSize/2, worldSize/2]', () => {
      const worldSize = CONFIG.worldSize;
      for (let camX = 0; camX < worldSize; camX += 200) {
        for (let entX = 0; entX < worldSize; entX += 200) {
          camera.position.set(camX, 0, 100);
          const offset = controller.getWrappedOffset(entX, 0);
          expect(offset.dx).toBeGreaterThanOrEqual(-worldSize / 2);
          expect(offset.dx).toBeLessThanOrEqual(worldSize / 2);
        }
      }
    });
  });

  describe('getWrappedRenderPosition - for Three.js world space', () => {
    it('should return position where entity should appear in world space', () => {
      // Camera at 1900, entity at 100
      // Entity should appear at 2100 (wrapped position)
      camera.position.set(1900, 1000, 100);
      const pos = controller.getWrappedRenderPosition(100, 1000);
      expect(pos.x).toBe(2100);
      expect(pos.y).toBe(1000);
    });

    it('should handle entity that does not need wrapping', () => {
      camera.position.set(500, 500, 100);
      const pos = controller.getWrappedRenderPosition(600, 600);
      expect(pos.x).toBe(600);
      expect(pos.y).toBe(600);
    });

    it('should handle negative wrap (entity far left, camera far right)', () => {
      camera.position.set(CONFIG.worldSize - 100, 500, 100);
      const pos = controller.getWrappedRenderPosition(50, 500);
      expect(pos.x).toBe(50 + CONFIG.worldSize); // Should appear to the right of camera
      expect(pos.y).toBe(500);
    });
  });

  describe('worldToScreen - screen coordinate conversion', () => {
    it('should convert world position to screen coordinates', () => {
      camera.position.set(1000, 1000, 100);
      const screen = controller.worldToScreen(1100, 900, 800, 600);
      // dx = 100, dy = -100 (entity above camera)
      // screen.x = 800/2 + 100 = 500
      // screen.y = 600/2 - (-100) = 400 (screen Y is inverted)
      expect(screen.x).toBeCloseTo(800 / 2 + 100);
      expect(screen.y).toBeCloseTo(600 / 2 + 100); // dy is -100, so minus minus gives plus
    });

    it('should handle wrapped positions', () => {
      camera.position.set(100, 1000, 100);
      const screen = controller.worldToScreen(CONFIG.worldSize - 50, 1000, 800, 600);
      // Entity at 1950, camera at 100: dx = 1850 -> wraps to -150
      expect(screen.x).toBeCloseTo(800 / 2 - 150);
      expect(screen.y).toBeCloseTo(600 / 2);
    });
  });
});
