import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { SpriteManager } from './SpriteManager';
import { CameraController } from './CameraController';
import { FLOOR_COLOR } from '../../systems/rendering';
import type { CanvasContext } from '../../types';
import type { Player } from '../../entities/player';
import type { Enemy } from '../../entities/enemy';
import type { Projectile } from '../../entities/projectile';
import type { FireballProjectile } from '../../entities/fireballProjectile';
import type { Loot } from '../../entities/loot';
import type { Obstacle } from '../../entities/obstacle';
import type { Particle } from '../../entities/particle';

/**
 * Main Three.js renderer that replaces Canvas 2D rendering.
 * Manages the scene, sprites, camera, and all visual elements.
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

  // Floor plane
  private floor: THREE.Mesh;

  // Grid lines
  private gridLines: THREE.LineSegments | null = null;

  // Feature flag to enable/disable Three.js
  static enabled = true;

  constructor() {
    this.sceneManager = new SceneManager();
    this.spriteManager = new SpriteManager();
    this.cameraController = new CameraController(this.sceneManager.camera);

    // Create floor plane
    const floorGeometry = new THREE.PlaneGeometry(2000, 2000);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: FLOOR_COLOR });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.position.z = -10;
    this.sceneManager.addToScene(this.floor);

    this.spriteManager.init();
  }

  init(canvas: HTMLCanvasElement): void {
    if (!ThreeRenderer.enabled) return;
    this.sceneManager.init(canvas);
    this.createGrid();
  }

  private createGrid(): void {
    const gridSize = 2000;
    const tileSize = 100;
    const lines: THREE.Vector3[] = [];

    // Vertical lines
    for (let x = 0; x <= gridSize; x += tileSize) {
      lines.push(new THREE.Vector3(x, 0, -5));
      lines.push(new THREE.Vector3(x, gridSize, -5));
    }

    // Horizontal lines
    for (let y = 0; y <= gridSize; y += tileSize) {
      lines.push(new THREE.Vector3(0, y, -5));
      lines.push(new THREE.Vector3(gridSize, y, -5));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(lines);
    const material = new THREE.LineBasicMaterial({ color: 0x252b3d, transparent: true, opacity: 0.5 });
    this.gridLines = new THREE.LineSegments(geometry, material);
    this.sceneManager.addToScene(this.gridLines);
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

    this.playerView.position.set(player.x, player.y, 0);
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
        view = this.spriteManager.getSpriteWithShadow(enemy.sprite, enemy.radius * 2);
        this.sceneManager.addToScene(view);
        this.enemyViews.set(enemy, view);
        this.activeEnemies.add(enemy);
      }

      view.position.set(enemy.x, enemy.y, 0);
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

      view.position.set(proj.x, proj.y, 0);
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

    // Update or create loot views
    for (const item of loot) {
      if (item.marked) continue;

      let view = this.lootViews.get(item);

      if (!view) {
        // Determine color based on type
        let color = 0xffff00; // Gold (default for gems)
        if (item.type === 'chest') color = 0x9333ea; // Purple for chests
        if (item.type === 'heart') color = 0xff4444; // Red for hearts

        const material = new THREE.SpriteMaterial({
          color,
          depthTest: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(12, 12, 1);

        view = new THREE.Group();
        view.add(sprite);
        this.sceneManager.addToScene(view);
        this.lootViews.set(item, view);
        this.activeLoot.add(item);
      }

      view.position.set(item.x, item.y, 0);
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

        // Inner bright core
        const coreMaterial = new THREE.SpriteMaterial({
          color: 0xffffff,
          depthTest: false,
        });
        const core = new THREE.Sprite(coreMaterial);
        core.scale.set(fb.radius * 1.5, fb.radius * 1.5, 1);
        view.add(core);

        // Outer orange glow
        const glowMaterial = new THREE.SpriteMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.6,
          depthTest: false,
        });
        const glow = new THREE.Sprite(glowMaterial);
        glow.scale.set(fb.radius * 3, fb.radius * 3, 1);
        glow.position.z = -0.1;
        view.add(glow);

        this.sceneManager.addToScene(view);
        this.fireballViews.set(fb, view);
        this.activeFireballs.add(fb);
      }

      view.position.set(fb.x, fb.y, 0);
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
      positions[i * 3 + 2] = 1;

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
   * Draw obstacles using Canvas 2D (overlay approach)
   * This keeps complex obstacle rendering simple while using Three.js for everything else
   */
  renderObstaclesCanvas(ctx: CanvasContext, obstacles: Obstacle[]): void {
    if (!ctx) return;

    for (const obs of obstacles) {
      ctx.save();
      ctx.translate(obs.x, obs.y);

      if (obs.type === 'font') {
        // Healing fountain
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', 0, 0);
      } else {
        // Ruin/obstacle
        ctx.fillStyle = '#3a4a5a';
        ctx.fillRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
        ctx.strokeStyle = '#5a6a7a';
        ctx.lineWidth = 2;
        ctx.strokeRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
      }

      ctx.restore();
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
      ctx.fillStyle = '#f00';
      ctx.fillRect(cw / 2 - 15, ch / 2 + 18, 30, 4);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(cw / 2 - 15, ch / 2 + 18, 30 * hpPct, 4);
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
