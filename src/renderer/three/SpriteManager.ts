import * as THREE from 'three';
import { SPRITES } from '../../assets/sprites';
import { PALETTE } from '../../assets/palette';
import type { Sprites } from '../../types';

/**
 * Manages sprite textures and creates sprite objects.
 * Converts the 10x10 character sprite maps into Three.js textures.
 */
export class SpriteManager {
  private textures: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Pre-generate all textures from sprite definitions
   */
  init(): void {
    for (const key of Object.keys(SPRITES)) {
      this.textures.set(key, this.createTexture(key));
    }
  }

  /**
   * Convert a 10x10 character sprite to a Three.js texture
   */
  private createTexture(spriteKey: string): THREE.CanvasTexture {
    const art = SPRITES[spriteKey as keyof Sprites];
    if (!art) {
      // Create a fallback texture
      return this.createFallbackTexture(spriteKey);
    }

    const size = 10;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return this.createFallbackTexture(spriteKey);
    }

    // Draw the sprite pixel by pixel
    // Note: Camera is flipped on Y axis, so we don't flip texture here
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const char = art[py]?.[px] as keyof typeof PALETTE;
        const color = char !== undefined ? PALETTE[char] : undefined;
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // Keep pixels sharp
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
  }

  private createFallbackTexture(name: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = '#000';
      ctx.font = '6px monospace';
      ctx.fillText(name.charAt(0), 1, 6);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  /**
   * Get a Three.js Sprite for the given sprite key
   */
  getSprite(spriteKey: string, scale = 1): THREE.Sprite {
    const texture = this.textures.get(spriteKey);
    if (!texture) {
      console.warn(`Missing texture for sprite: ${spriteKey}`);
      return this.createErrorSprite();
    }

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false, // Disable depth test for 2D sprites
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale, 1);
    return sprite;
  }

  /**
   * Create a sprite with a shadow beneath it
   */
  getSpriteWithShadow(spriteKey: string, scale = 1): THREE.Group {
    const group = new THREE.Group();

    // Shadow sprite
    const shadowMaterial = new THREE.SpriteMaterial({
      map: this.createShadowTexture(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const shadow = new THREE.Sprite(shadowMaterial);
    shadow.scale.set(scale * 0.8, scale * 0.4, 1);
    shadow.position.set(0, -scale * 0.3, -0.1);
    group.add(shadow);

    // Main sprite
    const sprite = this.getSprite(spriteKey, scale);
    sprite.position.set(0, 0, 0);
    group.add(sprite);

    return group;
  }

  private createShadowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(8, 4, 0, 8, 4, 8);
      gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 16, 8);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  private createErrorSprite(): THREE.Sprite {
    const material = new THREE.SpriteMaterial({
      color: 0xff00ff,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(10, 10, 1);
    return sprite;
  }

  dispose(): void {
    for (const texture of this.textures.values()) {
      texture.dispose();
    }
    this.textures.clear();
  }
}
