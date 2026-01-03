import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { SpriteManager } from './SpriteManager';
import { CameraController } from './CameraController';
import type { CanvasContext } from '../../types';
import type { Player } from '../../entities/player';
import type { Enemy } from '../../entities/enemy';
import type { Projectile } from '../../entities/projectile';
import type { FireballProjectile } from '../../entities/fireballProjectile';
import type { Loot } from '../../entities/loot';
import type { Obstacle } from '../../entities/obstacle';
import type { Particle } from '../../entities/particle';

/**
 * Main Three.js renderer for game entities.
 * Floor, grid, and UI are handled by Canvas 2D overlay.
 */
export class ThreeRenderer {
  sceneManager: SceneManager;
  spriteManager: SpriteManager;
  cameraController: CameraController;

  // Entity sprite views - using WeakMap for automatic cleanup
  private enemyViews: WeakMap<Enemy, THREE.Group> = new WeakMap();
  private projectileViews: WeakMap<Projectile, THREE.Sprite> = new WeakMap();
  private lootViews: WeakMap<Loot, THREE.Group> = new WeakMap();
  private fireballViews: WeakMap<FireballProjectile, THREE.Group> = new WeakMap();

  // Keep track of active entities for cleanup
  private activeEnemies = new Set<Enemy>();
  private activeProjectiles = new Set<Projectile>();
  private activeLoot = new Set<Loot>();
  private activeFireballs = new Set<FireballProjectile>();

  // Player view
  private playerView: THREE.Group | null = null;

  // Particles are recreated each frame
  private particleViews: THREE.Points[] = [];

  // Feature flag to enable/disable Three.js
  static enabled = true;

  constructor() {
    this.sceneManager = new SceneManager();
    this.spriteManager = new SpriteManager();
    this.cameraController = new CameraController(this.sceneManager.camera);
    this.spriteManager.init();
  }

  init(canvas: HTMLCanvasElement): void {
    if (!ThreeRenderer.enabled) return;
    this.sceneManager.init(canvas);
  }

  resize(width: number, height: number): void {
    if (!ThreeRenderer.enabled) return;
    this.sceneManager.resize(width, height);
  }

  /**
   * Main render call - called from game loop
   * Takes actual entity objects for efficient rendering
   */
  render(
    player: Player | null,
    enemies: Enemy[],
    projectiles: Projectile[],
    loot: Loot[],
    fireballs: FireballProjectile[],
    particles: Particle[],
    width: number,
    height: number
  ): void {
    if (!ThreeRenderer.enabled) return;

    // Update camera to follow player
    if (player) {
      this.cameraController.follow(player.x, player.y, width, height);
    }

    // Render all entities
    this.renderPlayer(player);
    this.renderEnemies(enemies);
    this.renderProjectiles(projectiles);
    this.renderLoot(loot);
    this.renderFireballs(fireballs);
    this.renderParticles(particles);

    // Finally render the scene
    this.sceneManager.render();
  }

  private renderPlayer(player: Player | null): void {
    if (!player) return;

    if (!this.playerView) {
      // Player uses charId as sprite key
      this.playerView = this.spriteManager.getSpriteWithShadow(player.charId, player.radius * 2.5);
      this.sceneManager.addToScene(this.playerView);
    }

    this.playerView.position.set(player.x, player.y, 10);
    this.playerView.visible = true;
  }

  private renderEnemies(enemies: Enemy[]): void {
    // Clean up removed enemies
    const currentSet = new Set(enemies);
    for (const enemy of this.activeEnemies) {
      if (!currentSet.has(enemy)) {
        const view = this.enemyViews.get(enemy);
        if (view) {
          this.sceneManager.removeFromScene(view);
        }
        this.activeEnemies.delete(enemy);
      }
    }

    // Update or create enemy views
    for (const enemy of enemies) {
      if (enemy.marked) continue;

      let view = this.enemyViews.get(enemy);

      if (!view) {
        view = this.spriteManager.getSpriteWithShadow(enemy.sprite, enemy.radius * 2.5);
        this.sceneManager.addToScene(view);
        this.enemyViews.set(enemy, view);
        this.activeEnemies.add(enemy);
      }

      view.position.set(enemy.x, enemy.y, 9);
      view.visible = !enemy.marked;
    }
  }

  private renderProjectiles(projectiles: Projectile[]): void {
    // Clean up removed projectiles
    const currentSet = new Set(projectiles);
    for (const proj of this.activeProjectiles) {
      if (!currentSet.has(proj)) {
        const view = this.projectileViews.get(proj);
        if (view) {
          this.sceneManager.removeFromScene(view);
          view.material.dispose();
        }
        this.activeProjectiles.delete(proj);
      }
    }

    // Update or create projectile views
    for (const proj of projectiles) {
      if (proj.marked) continue;

      let view = this.projectileViews.get(proj);

      if (!view) {
        const material = new THREE.SpriteMaterial({
          color: new THREE.Color(proj.color),
          depthTest: false,
        });
        view = new THREE.Sprite(material);
        view.scale.set(proj.radius * 2, proj.radius * 2, 1);
        this.sceneManager.addToScene(view);
        this.projectileViews.set(proj, view);
        this.activeProjectiles.add(proj);
      }

      view.position.set(proj.x, proj.y, 11);
      view.visible = !proj.marked;
    }
  }

  private renderLoot(loot: Loot[]): void {
    // Clean up removed loot
    const currentSet = new Set(loot);
    for (const item of this.activeLoot) {
      if (!currentSet.has(item)) {
        const view = this.lootViews.get(item);
        if (view) {
          this.sceneManager.removeFromScene(view);
        }
        this.activeLoot.delete(item);
      }
    }

    // Animation time for effects
    const time = Date.now() / 1000;

    // Update or create loot views
    for (const item of loot) {
      if (item.marked) continue;

      let view = this.lootViews.get(item);

      if (!view) {
        // For gems, create a 3D octahedron (diamond shape)
        if (item.type === 'gem') {
          const geometry = new THREE.OctahedronGeometry(8, 0);
          // Scale to make it taller (stretch Y axis)
          geometry.scale(1, 1.3, 1);
          const material = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.3,
            metalness: 0.3,
            roughness: 0.2,
          });
          const mesh = new THREE.Mesh(geometry, material);

          // Add edge outline for better rotation visibility
          const edges = new THREE.EdgesGeometry(geometry);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0x6ee7b7, linewidth: 3 });
          const wireframe = new THREE.LineSegments(edges, lineMaterial);
          mesh.add(wireframe);

          view = new THREE.Group();
          view.add(mesh);
        } else {
          // For hearts and chests, use sprites
          const spriteKey = item.type === 'chest' ? 'chest' : 'heart';
          const sprite = this.spriteManager.getSprite(spriteKey, 20);
          view = new THREE.Group();
          view.add(sprite);
        }

        this.sceneManager.addToScene(view);
        this.lootViews.set(item, view);
        this.activeLoot.add(item);
      }

      // Animate gems with hover and 3D rotation
      if (item.type === 'gem') {
        const hoverOffset = Math.sin(time * 3 + item.x) * 2; // Hover up/down 2px
        view.position.set(item.x, item.y + hoverOffset, 7);
        // 3D rotation - spin on Y axis only
        const mesh = view.children[0] as THREE.Mesh;
        if (mesh) {
          mesh.rotation.y = time * 2 + item.x; // Continuous spinning
        }
      } else {
        view.position.set(item.x, item.y, 7);
      }

      // Animate hearts with gentle hover
      if (item.type === 'heart') {
        const hoverOffset = Math.sin(time * 2 + item.x) * 1.5;
        view.position.y = item.y + hoverOffset;
      }

      view.visible = !item.marked;
    }
  }

  private renderFireballs(fireballs: FireballProjectile[]): void {
    // Clean up removed fireballs
    const currentSet = new Set(fireballs);
    for (const fb of this.activeFireballs) {
      if (!currentSet.has(fb)) {
        const view = this.fireballViews.get(fb);
        if (view) {
          this.sceneManager.removeFromScene(view);
        }
        this.activeFireballs.delete(fb);
      }
    }

    // Update or create fireball views
    for (const fb of fireballs) {
      if (fb.marked) continue;

      let view = this.fireballViews.get(fb);

      if (!view) {
        // Fireball is orange with a glow effect
        view = new THREE.Group();

        // Outer orange glow (larger)
        const glowMaterial = new THREE.SpriteMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.4,
          depthTest: false,
        });
        const glow = new THREE.Sprite(glowMaterial);
        glow.scale.set(fb.radius * 4, fb.radius * 4, 1);
        glow.position.z = -0.1;
        view.add(glow);

        // Middle layer
        const midMaterial = new THREE.SpriteMaterial({
          color: 0xff8800,
          transparent: true,
          opacity: 0.6,
          depthTest: false,
        });
        const mid = new THREE.Sprite(midMaterial);
        mid.scale.set(fb.radius * 2.5, fb.radius * 2.5, 1);
        view.add(mid);

        // Inner bright core
        const coreMaterial = new THREE.SpriteMaterial({
          color: 0xffffaa,
          depthTest: false,
        });
        const core = new THREE.Sprite(coreMaterial);
        core.scale.set(fb.radius * 1.2, fb.radius * 1.2, 1);
        core.position.z = 0.1;
        view.add(core);

        this.sceneManager.addToScene(view);
        this.fireballViews.set(fb, view);
        this.activeFireballs.add(fb);
      }

      view.position.set(fb.x, fb.y, 11);
      view.visible = !fb.marked;
    }
  }

  private renderParticles(particles: Particle[]): void {
    // Clear old particle views
    for (const points of this.particleViews) {
      this.sceneManager.removeFromScene(points);
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    }
    this.particleViews = [];

    if (particles.length === 0) return;

    // Create buffer geometry for all particles
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);

    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = 12; // Z position for particles

      const color = new THREE.Color(pt.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = pt.size;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false,
      depthTest: false,
    });

    const points = new THREE.Points(geometry, material);
    this.sceneManager.addToScene(points);
    this.particleViews.push(points);
  }

  /**
   * Draw floor and grid using Canvas 2D (background layer)
   * This is drawn before Three.js sprites
   */
  renderBackgroundCanvas(
    ctx: CanvasContext,
    player: { x: number; y: number } | null,
    width: number,
    height: number
  ): void {
    if (!ctx) return;

    // Clear with black
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    if (!player) return;

    // Get Three.js camera bounds to sync background with sprites
    const camera = this.sceneManager.camera;
    const halfWidth = (camera.right - camera.left) / 2;
    const halfHeight = (camera.top - camera.bottom) / 2;

    const camX = camera.position.x;
    const camY = camera.position.y;

    // Calculate screen-to-world ratio (pixels per world unit)
    const pixelsPerUnitX = width / (halfWidth * 2);
    const pixelsPerUnitY = height / (halfHeight * 2);

    // Draw grid/floor aligned with Three.js world coordinates
    const tileSize = 100;

    // Calculate starting world position for visible area
    const startWorldX = camX - halfWidth;
    const startWorldY = camY - halfHeight;

    // Calculate first visible grid line positions
    const firstGridX = Math.floor(startWorldX / tileSize) * tileSize;
    const firstGridY = Math.floor(startWorldY / tileSize) * tileSize;

    ctx.strokeStyle = '#1a2030';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical grid lines - convert world X to screen X
    for (let worldX = firstGridX; worldX < startWorldX + halfWidth * 2 + tileSize; worldX += tileSize) {
      const screenX = (worldX - camX) * pixelsPerUnitX + width / 2;
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, height);
    }

    // Horizontal grid lines - convert world Y to screen Y (flip Y for screen coords)
    for (let worldY = firstGridY; worldY < startWorldY + halfHeight * 2 + tileSize; worldY += tileSize) {
      const screenY = height / 2 + (worldY - camY) * pixelsPerUnitY;
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
    }

    ctx.stroke();
  }

  /**
   * Draw obstacles using Canvas 2D (overlay approach)
   * Aligned with Three.js camera to prevent parallax
   */
  renderObstaclesCanvas(ctx: CanvasContext, obstacles: Obstacle[], _playerX: number, _playerY: number, cw: number, ch: number): void {
    if (!ctx) return;

    // Get Three.js camera bounds for coordinate alignment
    const camera = this.sceneManager.camera;
    const camX = camera.position.x;
    const camY = camera.position.y;
    const halfWidth = (camera.right - camera.left) / 2;
    const halfHeight = (camera.top - camera.bottom) / 2;

    // Calculate screen-to-world ratio (pixels per world unit)
    const pixelsPerUnitX = cw / (halfWidth * 2);
    const pixelsPerUnitY = ch / (halfHeight * 2);

    for (const obs of obstacles) {
      // Calculate relative position from camera (using actual player position passed from game)
      let rx = obs.x - camX;
      let ry = obs.y - camY;

      // Handle world wrapping
      const worldSize = 2000; // CONFIG.worldSize
      if (rx < -worldSize / 2) rx += worldSize;
      if (rx > worldSize / 2) rx -= worldSize;
      if (ry < -worldSize / 2) ry += worldSize;
      if (ry > worldSize / 2) ry -= worldSize;

      // Convert to screen coordinates
      const sx = rx * pixelsPerUnitX + cw / 2;
      const sy = ch / 2 + ry * pixelsPerUnitY;

      // Culling
      if (sx < -100 || sx > cw + 100 || sy < -100 || sy > ch + 100) continue;

      // Draw obstacle shape
      obs.drawShape(ctx, sx, sy);
    }
  }

  /**
   * Draw UI elements (health bar, joysticks) using Canvas 2D
   */
  renderUI(
    ctx: CanvasContext,
    playerHp: number,
    playerMaxHp: number,
    touchData: {
      hasTouch: boolean;
      joyActive: boolean;
      joyX: number;
      joyY: number;
      aimJoyActive: boolean;
      aimJoyX: number;
      aimJoyY: number;
    }
  ): void {
    if (!ctx) return;

    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    // Player health bar (above player)
    if (playerMaxHp > 0) {
      const hpPct = Math.max(0, playerHp / playerMaxHp);
      ctx.fillStyle = 'red';
      ctx.fillRect(cw / 2 - 15, ch / 2 + 21, 30, 4);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(cw / 2 - 15, ch / 2 + 21, 30 * hpPct, 4);
    }

    // Touch joysticks
    if (touchData.hasTouch) {
      const joyRadius = 50;
      const knobRadius = 20;

      if (touchData.joyActive) {
        const joyX = cw / 2 - 100;
        const joyY = ch - 100;
        const knobX = joyX + touchData.joyX * joyRadius;
        const knobY = joyY + touchData.joyY * joyRadius;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(joyX, joyY, joyRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (touchData.aimJoyActive) {
        const aimJoyX = cw / 2 + 100;
        const aimJoyY = ch - 100;
        const aimKnobX = aimJoyX + touchData.aimJoyX * joyRadius;
        const aimKnobY = aimJoyY + touchData.aimJoyY * joyRadius;

        ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(aimJoyX, aimJoyY, joyRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
        ctx.beginPath();
        ctx.arc(aimKnobX, aimKnobY, knobRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  dispose(): void {
    this.spriteManager.dispose();
    this.sceneManager.dispose();

    // Clear player view
    if (this.playerView) {
      this.sceneManager.removeFromScene(this.playerView);
      this.playerView = null;
    }

    // Clear particle views
    for (const points of this.particleViews) {
      this.sceneManager.removeFromScene(points);
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    }
    this.particleViews = [];

    // Clear active entity tracking
    this.activeEnemies.clear();
    this.activeProjectiles.clear();
    this.activeLoot.clear();
    this.activeFireballs.clear();
  }
}

// Singleton instance
export const threeRenderer = new ThreeRenderer();
