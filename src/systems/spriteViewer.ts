import * as THREE from 'three';
import { SPRITES } from '../assets/sprites';
import { PALETTE } from '../assets/palette';
import type { PaletteKey, SpriteKey } from '../types';

function isPaletteKey(char: string): char is PaletteKey {
  return char in PALETTE;
}

interface SpriteView {
  group: THREE.Group;
  type: 'sprite' | 'gem' | 'heart' | 'chest';
  name: string;
  baseY: number;
}

class SpriteViewerSystem {
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  private spriteViews: SpriteView[] = [];
  private startTime = Date.now();

  /**
   * Initialize the sprite viewer
   */
  open(): void {
    const container = document.getElementById('sprite-viewer-container');
    this.canvas = document.getElementById('sprite-viewer-canvas') as HTMLCanvasElement;

    if (!container || !this.canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Set up canvas size
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    // Create Three.js scene
    this.scene = new THREE.Scene();

    // Orthographic camera - larger viewSize = smaller sprites
    const aspect = width / height;
    const viewSize = 400; // 50% larger than current
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 100);
    this.camera.lookAt(0, 0, 0);
    this.camera.scale.y = -1; // Match Canvas 2D coordinate system

    // WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create all sprite views
    this.createAllSprites();

    // Start animation loop
    this.startTime = Date.now();
    this.animate();
  }

  close(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Clean up Three.js resources
    for (const view of this.spriteViews) {
      this.scene?.remove(view.group);
    }
    this.spriteViews = [];

    this.renderer?.dispose();
    this.renderer = null;
    this.camera = null;
    this.scene = null;
    this.canvas = null;
  }

  private createAllSprites(): void {
    if (!this.scene) return;

    const spriteKeys = Object.keys(SPRITES) as SpriteKey[];
    const spacing = 80;
    const perRow = 4; // Fewer per row for larger sprites

    spriteKeys.forEach((key, index) => {
      const row = Math.floor(index / perRow);
      const col = index % perRow;

      const x = (col - perRow / 2 + 0.5) * spacing;
      const y = (row - 3) * spacing;

      let group: THREE.Group;

      // Special handling for different sprite types
      if (key === 'gem') {
        group = this.createGemSprite(x, y);
      } else if (key === 'chest' || key === 'heart') {
        group = this.createLootSprite(key, x, y);
      } else {
        group = this.createRegularSprite(key, x, y);
      }

      this.scene!.add(group);
      this.spriteViews.push({ group, type: key === 'gem' ? 'gem' : key === 'heart' ? 'heart' : key === 'chest' ? 'chest' : 'sprite', name: key, baseY: y });
    });
  }

  private createRegularSprite(spriteKey: string, x: number, y: number): THREE.Group {
    const group = new THREE.Group();

    // Create texture from sprite data
    const art = SPRITES[spriteKey as SpriteKey];
    if (!art) return group;

    const size = 10;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const char = art[py]?.[px];
          if (char && isPaletteKey(char)) {
            const color = PALETTE[char];
            if (color) {
              ctx.fillStyle = color;
              ctx.fillRect(px, py, 1, 1);
            }
          }
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    // Create shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 16;
    shadowCanvas.height = 8;
    const shadowCtx = shadowCanvas.getContext('2d');
    if (shadowCtx) {
      const gradient = shadowCtx.createRadialGradient(8, 4, 0, 8, 4, 8);
      gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      shadowCtx.fillStyle = gradient;
      shadowCtx.fillRect(0, 0, 16, 8);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

    const shadowMaterial = new THREE.SpriteMaterial({
      map: shadowTexture,
      transparent: true,
      depthTest: false,
    });
    const shadow = new THREE.Sprite(shadowMaterial);
    shadow.scale.set(40, 20, 1);
    shadow.position.set(x, y - 15, -0.1);
    group.add(shadow);

    // Main sprite - larger to match in-game size
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(50, 50, 1);
    sprite.position.set(x, y, 0);
    group.add(sprite);

    return group;
  }

  private createGemSprite(x: number, y: number): THREE.Group {
    const group = new THREE.Group();

    // Create 3D octahedron (diamond shape) - larger to match in-game
    const geometry = new THREE.OctahedronGeometry(12, 0);
    geometry.scale(1, 1.3, 1);

    const material = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Add edge outline
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x6ee7b7, linewidth: 3 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(wireframe);

    group.add(mesh);
    group.position.set(x, y, 0);

    return group;
  }

  private createLootSprite(spriteKey: 'chest' | 'heart', x: number, y: number): THREE.Group {
    const group = new THREE.Group();

    if (spriteKey === 'heart') {
      // Create 3D heart shape using the same parametric equation as the outline
      const heartShape = this.createHeartShapeGeometry();

      const material = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0xff0000,
        emissiveIntensity: 0.3,
        metalness: 0.1,
        roughness: 0.3,
        flatShading: false,
      });

      const mesh = new THREE.Mesh(heartShape, material);
      group.add(mesh);

      // Add edge outline - they'll match since same equation
      const heartOutline = this.createHeartOutline();
      group.add(heartOutline);
    } else {
      // Chest - use sprite
      const art = SPRITES[spriteKey];
      if (!art) return group;

      const size = 10;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        for (let py = 0; py < size; py++) {
          for (let px = 0; px < size; px++) {
            const char = art[py]?.[px];
            if (char && isPaletteKey(char)) {
              const color = PALETTE[char];
              if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(px, py, 1, 1);
              }
            }
          }
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.colorSpace = THREE.SRGBColorSpace;

      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(40, 40, 1);
      sprite.position.set(0, 0, 0);
      group.add(sprite);
    }

    // Shadow for both
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 16;
    shadowCanvas.height = 8;
    const shadowCtx = shadowCanvas.getContext('2d');
    if (shadowCtx) {
      const gradient = shadowCtx.createRadialGradient(8, 4, 0, 8, 4, 8);
      gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      shadowCtx.fillStyle = gradient;
      shadowCtx.fillRect(0, 0, 16, 8);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

    const shadowMaterial = new THREE.SpriteMaterial({
      map: shadowTexture,
      transparent: true,
      depthTest: false,
    });
    const shadow = new THREE.Sprite(shadowMaterial);
    shadow.scale.set(40, 20, 1);
    shadow.position.set(0, -15, -0.1);
    group.add(shadow);

    group.position.set(x, y, 0);

    return group;
  }

  private createHeartShapeGeometry(): THREE.ExtrudeGeometry {
    // Create a heart shape using the same parametric equation as the outline
    const shape = new THREE.Shape();
    const segments = 64;
    const scale = 0.83; // 50% larger than original 0.55

    // Generate points from parametric equation
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      points.push(new THREE.Vector2(x * scale, -y * scale));
    }

    // Create shape from points
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }

    const extrudeSettings = {
      depth: 5,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center the geometry and adjust so rotation doesn't shift position
    geometry.center();
    // Move the geometry so the center of the heart volume is at origin
    geometry.translate(0, 0, -2.5); // Half the depth

    return geometry;
  }

  private createHeartOutline(): THREE.LineLoop {
    // Create a heart-shaped curve outline using same equation as 3D shape
    const points: THREE.Vector3[] = [];
    const segments = 64;
    const scale = 0.83; // Match 3D heart scale

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      // Outline at the center of the geometry (no Z offset since geometry is centered)
      points.push(new THREE.Vector3(x * scale, -y * scale, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffaaaa,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });

    return new THREE.LineLoop(geometry, material);
  }

  private animate = (): void => {
    if (!this.renderer || !this.scene || !this.camera) return;

    const time = (Date.now() - this.startTime) / 1000;

    // Animate gems (spin and hover)
    for (const view of this.spriteViews) {
      if (view.type === 'gem') {
        const mesh = view.group.children[0] as THREE.Mesh;
        if (mesh) {
          mesh.rotation.y = time * 2;
        }
        const hoverOffset = Math.sin(time * 3 + view.group.position.x) * 2;
        view.group.position.y = view.baseY + hoverOffset;
      } else if (view.type === 'heart') {
        // Hearts spin slowly and have gentle hover
        view.group.rotation.y = time * 1.5;
        const hoverOffset = Math.sin(time * 2 + view.group.position.x) * 1.5;
        view.group.position.y = view.baseY + hoverOffset;
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.animate);
  };
}

export const SpriteViewer = new SpriteViewerSystem();
