import * as THREE from 'three';
import { SPRITES } from '../../assets/sprites';
import { PALETTE } from '../../assets/palette';
import type { Sprites, PaletteKey } from '../../types';

// Sprite keys that have image files
const IMAGE_SPRITES: Set<string> = new Set(['bat', 'heart', 'gem', 'wizard', 'shield_bash', 'fireball']);

/**
 * Type guard to check if a character is a valid palette key.
 * Run-time check for invalid colors.
 */
function isPaletteKey(char: string): char is PaletteKey {
  return char in PALETTE;
}

/**
 * Manages sprite textures and creates sprite objects.
 * Supports both image sprites (PNG) and ASCII-based sprite maps.
 */
export class SpriteManager {
  private textures: Map<string, THREE.Texture> = new Map();

  /**
   * Pre-generate all textures from sprite definitions
   */
  async init(): Promise<void> {
    const spriteKeys = Object.keys(SPRITES);
    const imageKeys = Array.from(IMAGE_SPRITES).filter(key => !spriteKeys.includes(key));
    await Promise.all([...spriteKeys, ...imageKeys].map(key => this.loadTexture(key)));
  }

  /**
   * Load a texture - tries image file first, falls back to ASCII generation
   */
  private async loadTexture(spriteKey: string): Promise<void> {
    // Try loading from image file first
    if (IMAGE_SPRITES.has(spriteKey)) {
      try {
        const imageUrl = new URL(`../../assets/sprites/${spriteKey}.png`, import.meta.url).href;
        const texture = await new THREE.TextureLoader().loadAsync(imageUrl);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        // Process image to make white background transparent
        if (spriteKey === 'bat') {
          const processedTexture = await this.makeWhiteTransparent(texture);
          this.textures.set(spriteKey, processedTexture);
        } else {
          // heart already has transparency (RGBA)
          this.textures.set(spriteKey, texture);
        }
        return;
      } catch (e) {
        console.warn(`[SpriteManager] Failed to load image for ${spriteKey}, falling back to ASCII`, e);
      }
    }

    // Fall back to ASCII sprite generation
    this.textures.set(spriteKey, this.createAsciiTexture(spriteKey));
  }

  /**
   * Make white pixels transparent in a texture
   */
  private async makeWhiteTransparent(texture: THREE.Texture): Promise<THREE.CanvasTexture> {
    return new Promise((resolve) => {
      const image = texture.image as HTMLImageElement;
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(new THREE.CanvasTexture(canvas));
        return;
      }

      // Draw original image
      ctx.drawImage(image, 0, 0);

      // Get image data and make white pixels transparent
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // If pixel is white or near-white, make it transparent
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0; // Set alpha to 0
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const newTexture = new THREE.CanvasTexture(canvas);
      newTexture.magFilter = THREE.NearestFilter;
      newTexture.minFilter = THREE.NearestFilter;
      newTexture.colorSpace = THREE.SRGBColorSpace;

      // Clean up original texture
      texture.dispose();

      resolve(newTexture);
    });
  }

  /**
   * Convert a 10x10 character sprite to a Three.js texture (fallback)
   */
  private createAsciiTexture(spriteKey: string): THREE.CanvasTexture {
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
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const char = art[py]?.[px];
        if (char && isPaletteKey(char)) {
          const color = PALETTE[char];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(px, py, 1, 1);
          }
        } else if (char && char !== '.') {
          // Log warning for undefined colors (helps catch missing palette entries)
          console.warn(`[SpriteManager] Undefined palette color '${char}' in sprite '${spriteKey}' at (${px},${py})`);
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
