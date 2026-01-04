import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { SpriteManager } from './SpriteManager';
import { CameraController } from './CameraController';
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
 *
 * World wrapping is handled by CameraController.getWrappedRenderPosition().
 * Camera position is kept in [0, worldSize] to match entity coordinates.
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
  private obstacleViews: WeakMap<Obstacle, THREE.Group> = new WeakMap();

  // Keep track of active entities for cleanup
  private activeEnemies = new Set<Enemy>();
  private activeProjectiles = new Set<Projectile>();
  private activeLoot = new Set<Loot>();
  private activeFireballs = new Set<FireballProjectile>();
  private activeObstacles = new Set<Obstacle>();

  // Player view
  private playerView: THREE.Group | null = null;

  // Particles are recreated each frame
  private particleViews: THREE.Points[] = [];

  // Illumination sprites for fireballs
  private fireballIllumViews: WeakMap<FireballProjectile, THREE.Sprite> = new WeakMap();
  private activeFireballIllums = new Set<FireballProjectile>();

  // Grid lines
  private gridLines: THREE.LineSegments | null = null;

  // UI elements (health bar, joysticks)
  private uiCamera: THREE.OrthographicCamera | null = null;
  private uiScene: THREE.Scene | null = null;
  private healthBar: THREE.Group | null = null;
  private joyGroup: THREE.Group | null = null;
  private aimJoyGroup: THREE.Group | null = null;

  // Feature flag to enable/disable Three.js
  static enabled = true;

  constructor() {
    this.sceneManager = new SceneManager();
    this.spriteManager = new SpriteManager();
    this.cameraController = new CameraController(this.sceneManager.camera);
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    if (!ThreeRenderer.enabled) return;
    this.sceneManager.init(canvas);
    await this.spriteManager.init();
    this.initUI(canvas);
  }

  resize(width: number, height: number): void {
    if (!ThreeRenderer.enabled) return;
    this.sceneManager.resize(width, height);
    if (this.uiCamera) {
      this.uiCamera.left = -width / 2;
      this.uiCamera.right = width / 2;
      this.uiCamera.top = height / 2;
      this.uiCamera.bottom = -height / 2;
      this.uiCamera.updateProjectionMatrix();
    }
  }

  private initUI(canvas: HTMLCanvasElement): void {
    if (!ThreeRenderer.enabled) return;

    // Create UI scene and camera (fixed screen space)
    this.uiScene = new THREE.Scene();
    this.uiCamera = new THREE.OrthographicCamera(
      -canvas.width / 2,
      canvas.width / 2,
      canvas.height / 2,
      -canvas.height / 2,
      0.1,
      100
    );
    this.uiCamera.position.z = 100;

    // Create health bar group
    this.healthBar = new THREE.Group();
    this.healthBar.position.z = 50;
    this.uiScene?.add(this.healthBar);

    // Create joystick group
    this.joyGroup = new THREE.Group();
    this.joyGroup.position.z = 50;
    this.uiScene?.add(this.joyGroup);

    // Create aim joystick group
    this.aimJoyGroup = new THREE.Group();
    this.aimJoyGroup.position.z = 50;
    this.uiScene?.add(this.aimJoyGroup);
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
    obstacles: Obstacle[],
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
    this.renderObstacles(obstacles);
    this.renderIllumination(particles, fireballs);

    // Finally render the scene
    this.sceneManager.render();
  }

  renderIllumination(_particles: Particle[], fireballs: FireballProjectile[]): void {
    const time = Date.now() / 1000;

    // Clean up removed fireball illuminations
    const currentFireballSet = new Set(fireballs);
    for (const fb of this.activeFireballIllums) {
      if (!currentFireballSet.has(fb)) {
        const view = this.fireballIllumViews.get(fb);
        if (view) {
          this.sceneManager.removeFromScene(view);
          view.material.dispose();
        }
        this.activeFireballIllums.delete(fb);
      }
    }

    // Update or create fireball illumination sprites
    for (const fb of fireballs) {
      if (fb.marked) continue;

      let illumSprite = this.fireballIllumViews.get(fb);

      if (!illumSprite) {
        // Create large glow sprite for fireball
        illumSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this.createGlowTexture(0xffc864, 256),
          transparent: true,
          opacity: 0.5,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        }));
        illumSprite.scale.set(fb.radius * 24, fb.radius * 24, 1);
        illumSprite.position.z = 1;
        this.sceneManager.addToScene(illumSprite);
        this.fireballIllumViews.set(fb, illumSprite);
        this.activeFireballIllums.add(fb);
      }

      const pos = this.cameraController.getWrappedRenderPosition(fb.x, fb.y);
      illumSprite.position.set(pos.x, pos.y, 1);

      const pulseScale = 1 + Math.sin(time * 5 + fb.x) * 0.3;
      illumSprite.scale.set(fb.radius * 24 * pulseScale, fb.radius * 24 * pulseScale, 1);
      illumSprite.visible = !fb.marked;
    }
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

      // Get wrapped render position from camera controller
      const pos = this.cameraController.getWrappedRenderPosition(enemy.x, enemy.y);
      view.position.set(pos.x, pos.y, 9);
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

      // Get wrapped render position
      const pos = this.cameraController.getWrappedRenderPosition(proj.x, proj.y);
      view.position.set(pos.x, pos.y, 11);
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
        // All loot types now use sprites
        const spriteKey = item.type === 'chest' ? 'chest' : item.type === 'heart' ? 'heart' : 'gem';
        const sprite = this.spriteManager.getSprite(spriteKey, 20);
        view = new THREE.Group();
        view.add(sprite);

        this.sceneManager.addToScene(view);
        this.lootViews.set(item, view);
        this.activeLoot.add(item);
      }

      // Get wrapped render position
      const pos = this.cameraController.getWrappedRenderPosition(item.x, item.y);

      // Base position
      view.position.set(pos.x, pos.y, 7);

      // Animate gems with gentle hover
      if (item.type === 'gem') {
        const hoverOffset = Math.sin(time * 3 + item.x) * 2;
        view.position.y = pos.y + hoverOffset;
      }

      // Animate hearts with gentle hover
      if (item.type === 'heart') {
        const hoverOffset = Math.sin(time * 2 + item.x) * 1.5;
        view.position.y = pos.y + hoverOffset;
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
        // Fireball with circular glow textures
        view = new THREE.Group();

        // Create circular glow texture
        const glowTexture = this.createGlowTexture(0xff6600, 128);
        const glowMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          opacity: 0.5,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Sprite(glowMaterial);
        glow.scale.set(fb.radius * 6, fb.radius * 6, 1);
        glow.position.z = -0.1;
        view.add(glow);

        // Middle layer - orange
        const midTexture = this.createGlowTexture(0xff8800, 64);
        const midMaterial = new THREE.SpriteMaterial({
          map: midTexture,
          transparent: true,
          opacity: 0.7,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        });
        const mid = new THREE.Sprite(midMaterial);
        mid.scale.set(fb.radius * 3, fb.radius * 3, 1);
        view.add(mid);

        // Inner bright core - yellow-white
        const coreTexture = this.createGlowTexture(0xffffcc, 32);
        const coreMaterial = new THREE.SpriteMaterial({
          map: coreTexture,
          transparent: true,
          opacity: 0.9,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        });
        const core = new THREE.Sprite(coreMaterial);
        core.scale.set(fb.radius * 1.5, fb.radius * 1.5, 1);
        core.position.z = 0.1;
        view.add(core);

        this.sceneManager.addToScene(view);
        this.fireballViews.set(fb, view);
        this.activeFireballs.add(fb);
      }

      // Get wrapped render position
      const pos = this.cameraController.getWrappedRenderPosition(fb.x, fb.y);
      view.position.set(pos.x, pos.y, 11);
      view.visible = !fb.marked;
    }
  }

  private renderObstacles(obstacles: Obstacle[]): void {
    // Clean up removed obstacles
    const currentSet = new Set(obstacles);
    for (const obs of this.activeObstacles) {
      if (!currentSet.has(obs)) {
        const view = this.obstacleViews.get(obs);
        if (view !== undefined) {
          this.sceneManager.removeFromScene(view);
        }
        this.activeObstacles.delete(obs);
      }
    }

    // Animation time
    const time = Date.now() / 1000;

    // Update or create obstacle views
    for (const obs of obstacles) {
      let view = this.obstacleViews.get(obs);

      if (view === undefined) {
        view = this.createObstacleView(obs);
        if (view) {
          this.sceneManager.addToScene(view);
          this.obstacleViews.set(obs, view);
          this.activeObstacles.add(obs);
        }
      }

      if (view) {
        // Get wrapped render position
        const pos = this.cameraController.getWrappedRenderPosition(obs.x, obs.y);
        view.position.set(pos.x, pos.y, 8);
        view.visible = !obs.marked;

        // Update fountain animation
        if (obs.type === 'font') {
          this.updateFountainAnimation(view, time);
        }
      }
    }
  }

  private createObstacleView(obs: Obstacle): THREE.Group {
    const group = new THREE.Group();

    if (obs.type === 'font') {
      this.createFountainGeometry(group);
    } else {
      this.createRuinGeometry(group, obs.w, obs.h);
    }

    return group;
  }

  private createFountainGeometry(group: THREE.Group): void {
    // Base pool - ellipse using path
    const poolShape = new THREE.Shape();
    const xRadius = 25;
    const yRadius = 8;
    for (let i = 0; i <= 32; i++) {
      const theta = (i / 32) * Math.PI * 2;
      const x = Math.cos(theta) * xRadius;
      const y = Math.sin(theta) * yRadius + 10;
      if (i === 0) poolShape.moveTo(x, y);
      else poolShape.lineTo(x, y);
    }
    poolShape.closePath();

    const poolGeometry = new THREE.ShapeGeometry(poolShape);
    const poolMaterial = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.DoubleSide });
    const pool = new THREE.Mesh(poolGeometry, poolMaterial);
    pool.position.z = 0;
    group.add(pool);

    // Water in pool
    const waterShape = new THREE.Shape();
    const wxRadius = 20;
    const wyRadius = 6;
    for (let i = 0; i <= 32; i++) {
      const theta = (i / 32) * Math.PI * 2;
      const x = Math.cos(theta) * wxRadius;
      const y = Math.sin(theta) * wyRadius + 10;
      if (i === 0) waterShape.moveTo(x, y);
      else waterShape.lineTo(x, y);
    }
    waterShape.closePath();

    const waterGeometry = new THREE.ShapeGeometry(waterShape);
    const waterMaterial = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.z = 0.1;
    group.add(water);

    // Fountain pillar
    const pillarGeometry = new THREE.PlaneGeometry(16, 25);
    const pillarMaterial = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.set(0, -2.5, 0.2);
    group.add(pillar);

    // Top basin
    const basinShape = new THREE.Shape();
    const bxRadius = 12;
    const byRadius = 4;
    for (let i = 0; i <= 32; i++) {
      const theta = (i / 32) * Math.PI * 2;
      const x = Math.cos(theta) * bxRadius;
      const y = Math.sin(theta) * byRadius - 15;
      if (i === 0) basinShape.moveTo(x, y);
      else basinShape.lineTo(x, y);
    }
    basinShape.closePath();

    const basinGeometry = new THREE.ShapeGeometry(basinShape);
    const basinMaterial = new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide });
    const basin = new THREE.Mesh(basinGeometry, basinMaterial);
    basin.position.z = 0.3;
    group.add(basin);

    // Water in basin
    const basinWaterShape = new THREE.Shape();
    const bwxRadius = 9;
    const bwyRadius = 3;
    for (let i = 0; i <= 32; i++) {
      const theta = (i / 32) * Math.PI * 2;
      const x = Math.cos(theta) * bwxRadius;
      const y = Math.sin(theta) * bwyRadius - 15;
      if (i === 0) basinWaterShape.moveTo(x, y);
      else basinWaterShape.lineTo(x, y);
    }
    basinWaterShape.closePath();

    const basinWaterGeometry = new THREE.ShapeGeometry(basinWaterShape);
    const basinWaterMaterial = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide });
    const basinWater = new THREE.Mesh(basinWaterGeometry, basinWaterMaterial);
    basinWater.position.z = 0.4;
    group.add(basinWater);

    // Pulsing water spout
    const spoutGeometry = new THREE.CircleGeometry(5, 16);
    const spoutMaterial = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.6,
    });
    const spout = new THREE.Mesh(spoutGeometry, spoutMaterial);
    spout.position.set(0, -25, 0.5);
    spout.userData = { isSpout: true };
    group.add(spout);

    // Water droplets
    for (let i = 0; i < 3; i++) {
      const dropGeometry = new THREE.CircleGeometry(2, 8);
      const dropMaterial = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
      });
      const drop = new THREE.Mesh(dropGeometry, dropMaterial);
      drop.userData = { isDrop: true, dropIndex: i };
      group.add(drop);
    }
  }

  private createRuinGeometry(group: THREE.Group, w: number, h: number): void {
    const hw = w / 2;
    const hh = h / 2;

    // Main structure - metal base
    const mainGeometry = new THREE.PlaneGeometry(w, h);
    const mainMaterial = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide });
    const main = new THREE.Mesh(mainGeometry, mainMaterial);
    main.position.z = 0;
    group.add(main);

    // Top highlight (metal edge)
    const topGeometry = new THREE.PlaneGeometry(w, 4);
    const topMaterial = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.DoubleSide });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.set(0, -hh + 2, 0.1);
    group.add(top);

    // Bottom shadow
    const bottomGeometry = new THREE.PlaneGeometry(w, 4);
    const bottomMaterial = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.position.set(0, hh - 2, 0.1);
    group.add(bottom);

    // Vertical panel lines
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    for (let panelX = -hw + 15; panelX < hw - 10; panelX += 25) {
      const lineGeometry = new THREE.PlaneGeometry(2, h - 8);
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(panelX, 0, 0.1);
      group.add(line);
    }

    // Horizontal panel line (middle)
    const horizGeometry = new THREE.PlaneGeometry(w - 8, 2);
    const horiz = new THREE.Mesh(horizGeometry, lineMaterial);
    horiz.position.z = 0.1;
    group.add(horiz);

    // Rivets/bolts
    const rivetMaterial = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
    const rivetGeometry = new THREE.CircleGeometry(3, 8);
    const rivetPositions = [
      [-hw + 6, -hh + 6], [hw - 6, -hh + 6],
      [-hw + 6, hh - 6], [hw - 6, hh - 6],
      [0, -hh + 6], [0, hh - 6],
    ];
    rivetPositions.forEach(([rx, ry]) => {
      const rivet = new THREE.Mesh(rivetGeometry, rivetMaterial);
      rivet.position.set(rx, ry, 0.2);
      group.add(rivet);
      // Rivet highlight
      const highlightGeometry = new THREE.CircleGeometry(1, 8);
      const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide });
      const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
      highlight.position.set(rx - 1, ry - 1, 0.3);
      group.add(highlight);
    });

    // Vent/grate in center if large enough
    if (w > 60 && h > 60) {
      const ventMaterial = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
      const ventW = 20;
      const ventH = 30;
      const ventGeometry = new THREE.PlaneGeometry(ventW, ventH);
      const vent = new THREE.Mesh(ventGeometry, ventMaterial);
      vent.position.z = 0.1;
      group.add(vent);

      // Vent slats
      const slatMaterial = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide });
      for (let vy = -10; vy <= 10; vy += 6) {
        const slatGeometry = new THREE.PlaneGeometry(ventW - 4, 2);
        const slat = new THREE.Mesh(slatGeometry, slatMaterial);
        slat.position.set(0, vy, 0.2);
        group.add(slat);
      }
    }

    // Warning stripe accent (bottom)
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const stripeY = hh - 12;
    for (let stripeX = -hw + 4; stripeX < hw - 4; stripeX += 16) {
      const stripeShape = new THREE.Shape();
      stripeShape.moveTo(0, 0);
      stripeShape.lineTo(8, 8);
      stripeShape.lineTo(6, 8);
      stripeShape.lineTo(-2, 0);
      stripeShape.closePath();
      const stripeGeometry = new THREE.ShapeGeometry(stripeShape);
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.position.set(stripeX, stripeY, 0.2);
      group.add(stripe);
    }
  }

  private updateFountainAnimation(group: THREE.Group, time: number): void {
    group.children.forEach(child => {
      if (child.userData.isSpout) {
        // Pulsing water spout
        const pulse = Math.sin(time * 5) * 3;
        (child as THREE.Mesh).scale.setScalar((4 + pulse) / 5);
        (child as THREE.Mesh).position.y = -25 - pulse;
      } else if (child.userData.isDrop) {
        // Water droplets
        const dropOffset = (time * 20) % 20;
        const i = child.userData.dropIndex;
        const dy = ((dropOffset + i * 7) % 20) - 5;
        const dx = Math.sin(dy * 0.5) * 3;
        const size = Math.max(0.1, 2 - (dy + 5) / 10);
        (child as THREE.Mesh).position.set(dx, -20 + dy, 0.6);
        (child as THREE.Mesh).scale.setScalar(size / 2);
        (child as THREE.Mesh).visible = size > 0;
      }
    });
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

    // Separate particles by type for different rendering
    const waterParticles: Particle[] = [];
    const splashParticles: Particle[] = [];
    const rippleParticles: Particle[] = [];
    const causticParticles: Particle[] = [];
    const foamParticles: Particle[] = [];
    const explosionParticles: Particle[] = [];
    const sparkParticles: Particle[] = [];
    const fireParticles: Particle[] = [];
    const smokeParticles: Particle[] = [];
    const bloodParticles: Particle[] = [];
    const gasParticles: Particle[] = [];

    for (const pt of particles) {
      if (pt.marked) continue;
      switch (pt.type) {
        case 'water':
          waterParticles.push(pt);
          break;
        case 'splash':
          splashParticles.push(pt);
          break;
        case 'ripple':
          rippleParticles.push(pt);
          break;
        case 'caustic':
          causticParticles.push(pt);
          break;
        case 'foam':
          foamParticles.push(pt);
          break;
        case 'explosion':
          explosionParticles.push(pt);
          break;
        case 'spark':
          sparkParticles.push(pt);
          break;
        case 'fire':
          fireParticles.push(pt);
          break;
        case 'smoke':
          smokeParticles.push(pt);
          break;
        case 'blood':
          bloodParticles.push(pt);
          break;
        case 'gas':
          gasParticles.push(pt);
          break;
      }
    }

    // Water: round droplet with gradient and highlight
    if (waterParticles.length > 0) {
      const positions = new Float32Array(waterParticles.length * 3);
      const colors = new Float32Array(waterParticles.length * 3);
      const alphas = new Float32Array(waterParticles.length);
      const sizes = new Float32Array(waterParticles.length);

      for (let i = 0; i < waterParticles.length; i++) {
        const pt = waterParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 13;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.max(0, pt.life / pt.maxLife) * 0.7;
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: Date.now() * 0.001 }
        },
        vertexShader: `
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vColor = color;
            vAlpha = alpha;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            // Round water droplet with gradient
            float alpha = (1.0 - dist) * vAlpha;
            vec3 finalColor = vColor;
            // Highlight at top-left
            float highlight = smoothstep(0.6, 0.0, length(coord - vec2(-0.15, -0.15))) * 0.4 * vAlpha;
            finalColor += vec3(highlight);
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Splash: tiny droplets, single pixel for very small
    if (splashParticles.length > 0) {
      const positions = new Float32Array(splashParticles.length * 3);
      const colors = new Float32Array(splashParticles.length * 3);
      const alphas = new Float32Array(splashParticles.length);
      const sizes = new Float32Array(splashParticles.length);

      for (let i = 0; i < splashParticles.length; i++) {
        const pt = splashParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 12;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.max(0, pt.life / pt.maxLife) * 0.3;
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vColor = color;
            vAlpha = alpha;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = max(1.0, size * 2.0) * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            float alpha = (1.0 - dist) * vAlpha;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Ripple: expanding concentric rings
    if (rippleParticles.length > 0) {
      const positions = new Float32Array(rippleParticles.length * 3);
      const colors = new Float32Array(rippleParticles.length * 3);
      const alphas = new Float32Array(rippleParticles.length);
      const sizes = new Float32Array(rippleParticles.length);

      for (let i = 0; i < rippleParticles.length; i++) {
        const pt = rippleParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 11;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.max(0, pt.life / pt.maxLife) * 0.5;
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vColor = color;
            vAlpha = alpha;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;

            // Ring effect - bright at specific radius
            float ringWidth = 0.15;
            float ringRadius = 0.35;
            float ring = 1.0 - smoothstep(0.0, ringWidth, abs(dist - ringRadius));

            // Second inner ring for larger ripples
            float innerRing = 0.0;
            if (vSize > 5.0) {
              float innerRadius = 0.2;
              innerRing = 0.5 * (1.0 - smoothstep(0.0, ringWidth, abs(dist - innerRadius)));
            }

            float alpha = (ring + innerRing) * vAlpha;
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Caustic: wavy light pattern with shimmer
    if (causticParticles.length > 0) {
      const positions = new Float32Array(causticParticles.length * 3);
      const colors = new Float32Array(causticParticles.length * 3);
      const alphas = new Float32Array(causticParticles.length);
      const sizes = new Float32Array(causticParticles.length);
      const offsets = new Float32Array(causticParticles.length);

      for (let i = 0; i < causticParticles.length; i++) {
        const pt = causticParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 10;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = 0.15;
        sizes[i] = pt.size;
        offsets[i] = pt.x * 0.1 + pt.y * 0.1;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: Date.now() * 0.005 }
        },
        vertexShader: `
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          attribute float offset;
          uniform float time;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          varying float vOffset;
          void main() {
            vColor = color;
            vAlpha = alpha;
            vSize = size;
            vOffset = offset;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          varying float vOffset;
          uniform float time;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            // Shimmer effect
            float shimmer = (sin(time * 3.0 + vOffset) + 1.0) * 0.5 * 0.1;

            // Main blob with soft edges
            float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * (vAlpha + shimmer);

            // Add smaller organic blobs
            vec2 offset1 = vec2(0.15, -0.1);
            vec2 offset2 = vec2(-0.1, 0.15);
            float blob1 = (1.0 - smoothstep(0.0, 1.0, length(coord - offset1) * 2.0));
            float blob2 = (1.0 - smoothstep(0.0, 1.0, length(coord - offset2) * 2.5));
            alpha += (blob1 + blob2) * 0.1;

            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Foam: white bubble with shine
    if (foamParticles.length > 0) {
      const positions = new Float32Array(foamParticles.length * 3);
      const colors = new Float32Array(foamParticles.length * 3);
      const alphas = new Float32Array(foamParticles.length);
      const sizes = new Float32Array(foamParticles.length);

      for (let i = 0; i < foamParticles.length; i++) {
        const pt = foamParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 13;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.max(0, pt.life / pt.maxLife) * 0.8;
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vColor = color;
            vAlpha = alpha;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            // White bubble
            float alpha = (1.0 - smoothstep(0.0, 0.8, dist)) * vAlpha;
            vec3 finalColor = vColor;

            // Shine at top-left
            float shine = smoothstep(0.6, 0.0, length(coord - vec2(-0.15, -0.15))) * 0.6 * vAlpha;
            finalColor += vec3(shine);

            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Explosion: orange expanding burst
    if (explosionParticles.length > 0) {
      const positions = new Float32Array(explosionParticles.length * 3);
      const colors = new Float32Array(explosionParticles.length * 3);
      const alphas = new Float32Array(explosionParticles.length);
      const sizes = new Float32Array(explosionParticles.length);

      for (let i = 0; i < explosionParticles.length; i++) {
        const pt = explosionParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 12;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.max(0, pt.life / pt.maxLife);
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vColor = color;
            vAlpha = alpha;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            // Soft edges
            float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * vAlpha;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Spark: small bright particles
    if (sparkParticles.length > 0) {
      const positions = new Float32Array(sparkParticles.length * 3);
      const colors = new Float32Array(sparkParticles.length * 3);
      const alphas = new Float32Array(sparkParticles.length);
      const sizes = new Float32Array(sparkParticles.length);

      for (let i = 0; i < sparkParticles.length; i++) {
        const pt = sparkParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 12;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.max(0, pt.life / pt.maxLife);
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vColor = color;
            vAlpha = alpha;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            // Bright sharp particles
            float alpha = (1.0 - smoothstep(0.0, 0.8, dist)) * vAlpha;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Fire: dynamic color shift (white -> yellow -> orange -> red)
    if (fireParticles.length > 0) {
      const positions = new Float32Array(fireParticles.length * 3);
      const lives = new Float32Array(fireParticles.length);
      const sizes = new Float32Array(fireParticles.length);

      for (let i = 0; i < fireParticles.length; i++) {
        const pt = fireParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 12;
        lives[i] = Math.max(0, pt.life / pt.maxLife);
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('life', new THREE.BufferAttribute(lives, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          attribute float life;
          attribute float size;
          varying float vLife;
          varying float vSize;
          void main() {
            vLife = life;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying float vLife;
          varying float vSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;

            float alpha = (1.0 - smoothstep(0.0, 1.0, dist));
            if (alpha < 0.01) discard;

            const float progress = 1.0 - vLife;

            // Dynamic color shift: White -> Yellow -> Orange -> Red
            vec3 fireColor;
            if (progress < 0.2) {
              fireColor = vec3(1.0, 1.0, 1.0); // White
            } else if (progress < 0.5) {
              fireColor = vec3(1.0, 0.8, 0.0); // Yellow
            } else {
              fireColor = vec3(1.0, 0.27, 0.0); // Red-orange
            }

            // Add bright core for new particles
            float core = smoothstep(0.5, 0.0, dist) * 0.5 * vLife;
            fireColor += vec3(core);

            alpha *= vLife;
            gl_FragColor = vec4(fireColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
        blending: THREE.NormalBlending,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Smoke: rising, expanding grey puffs
    if (smokeParticles.length > 0) {
      const positions = new Float32Array(smokeParticles.length * 3);
      const alphas = new Float32Array(smokeParticles.length);
      const sizes = new Float32Array(smokeParticles.length);

      for (let i = 0; i < smokeParticles.length; i++) {
        const pt = smokeParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 11;

        alphas[i] = Math.max(0, pt.life / pt.maxLife) * 0.5;
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          attribute float alpha;
          attribute float size;
          varying float vAlpha;
          varying float vSize;
          void main() {
            vAlpha = alpha;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying float vAlpha;
          varying float vSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            // Soft smoke with very gradual fade
            float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * vAlpha;
            vec3 smokeColor = vec3(0.39, 0.28, 0.53); // #64748b
            gl_FragColor = vec4(smokeColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Blood: red droplets
    if (bloodParticles.length > 0) {
      const positions = new Float32Array(bloodParticles.length * 3);
      const colors = new Float32Array(bloodParticles.length * 3);
      const alphas = new Float32Array(bloodParticles.length);
      const sizes = new Float32Array(bloodParticles.length);

      for (let i = 0; i < bloodParticles.length; i++) {
        const pt = bloodParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 12;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.max(0, pt.life / pt.maxLife) * 0.8;
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vColor = color;
            vAlpha = alpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * vAlpha;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Gas: soft green clouds
    if (gasParticles.length > 0) {
      const positions = new Float32Array(gasParticles.length * 3);
      const colors = new Float32Array(gasParticles.length * 3);
      const alphas = new Float32Array(gasParticles.length);
      const sizes = new Float32Array(gasParticles.length);

      for (let i = 0; i < gasParticles.length; i++) {
        const pt = gasParticles[i];
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 11;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.max(0, pt.life / pt.maxLife) * 0.3;
        sizes[i] = pt.size;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vColor = color;
            vAlpha = alpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord) * 2.0;
            if (dist > 1.0) discard;

            // Very soft gas cloud
            float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * vAlpha;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }
  }

  /**
    * Draw floor and grid using Three.js (background layer)
    * This is drawn before Three.js sprites
    */
  renderBackground(player: { x: number; y: number } | null): void {
    if (!player) return;

    // Clear old grid
    if (this.gridLines) {
      this.sceneManager.removeFromScene(this.gridLines);
      this.gridLines.geometry.dispose();
      (this.gridLines.material as THREE.Material).dispose();
      this.gridLines = null;
    }

    const camera = this.sceneManager.camera;
    const halfWidth = (camera.right - camera.left) / 2;
    const halfHeight = (camera.top - camera.bottom) / 2;

    const camX = camera.position.x;
    const camY = camera.position.y;

    // Draw grid/floor aligned with Three.js world coordinates
    const tileSize = 100;

    // Calculate visible grid area
    const startWorldX = camX - halfWidth - tileSize;
    const startWorldY = camY - halfHeight - tileSize;
    const endWorldX = camX + halfWidth + tileSize;
    const endWorldY = camY + halfHeight + tileSize;

    // Calculate grid line positions
    const points: number[] = [];

    // Vertical grid lines
    for (let worldX = startWorldX; worldX <= endWorldX; worldX += tileSize) {
      points.push(worldX, startWorldY, 0);
      points.push(worldX, endWorldY, 0);
    }

    // Horizontal grid lines
    for (let worldY = startWorldY; worldY <= endWorldY; worldY += tileSize) {
      points.push(startWorldX, worldY, 0);
      points.push(endWorldX, worldY, 0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x1a2030,
      transparent: true,
      opacity: 1,
    });

    this.gridLines = new THREE.LineSegments(geometry, material);
    this.gridLines.position.z = 0;
    this.sceneManager.addToScene(this.gridLines);
  }

  /**
    * Draw UI elements (health bar, joysticks) using Three.js
     */
  renderUI(
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
    if (!this.uiCamera || !this.uiScene) return;

    const cw = window.innerWidth;
    const ch = window.innerHeight;

    // Update health bar
    this.renderHealthBar(playerHp, playerMaxHp, cw, ch);

    // Update joysticks
    this.renderJoysticks(touchData, cw, ch);

    // Render UI scene on top of everything
    this.sceneManager.renderer.render(this.uiScene, this.uiCamera);
  }

  private renderHealthBar(playerHp: number, playerMaxHp: number, _cw: number, ch: number): void {
    if (!this.healthBar) return;

    // Clear existing health bar
    while (this.healthBar.children.length > 0) {
      const child = this.healthBar.children[0];
      this.healthBar.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    if (playerMaxHp <= 0) {
      this.healthBar.visible = false;
      return;
    }

    this.healthBar.visible = true;

    const hpPct = Math.max(0, playerHp / playerMaxHp);
    const barY = ch / 2 - 21;
    const barWidth = 30;
    const barHeight = 4;

    // Background (red)
    const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeometry, bgMaterial);
    bg.position.set(0, barY, 0);
    this.healthBar.add(bg);

    // Health (green)
    const healthWidth = barWidth * hpPct;
    if (healthWidth > 0) {
      const healthGeometry = new THREE.PlaneGeometry(healthWidth, barHeight);
      const healthMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
      const health = new THREE.Mesh(healthGeometry, healthMaterial);
      health.position.set(-(barWidth - healthWidth) / 2, barY, 0.1);
      this.healthBar.add(health);
    }
  }

  private renderJoysticks(touchData: {
    hasTouch: boolean;
    joyActive: boolean;
    joyX: number;
    joyY: number;
    aimJoyActive: boolean;
    aimJoyX: number;
    aimJoyY: number;
  }, cw: number, ch: number): void {
    if (!this.joyGroup || !this.aimJoyGroup) return;

    const joyRadius = 50;
    const knobRadius = 20;

    // Movement joystick (left)
    if (touchData.joyActive) {
      this.joyGroup.visible = true;
      this.updateJoystick(
        this.joyGroup,
        cw / 2 - 100,
        ch / 2 - 100,
        touchData.joyX,
        touchData.joyY,
        joyRadius,
        knobRadius,
        0xffffff,
        0.3
      );
    } else {
      this.joyGroup.visible = false;
    }

    // Aim joystick (right)
    if (touchData.aimJoyActive) {
      this.aimJoyGroup.visible = true;
      this.updateJoystick(
        this.aimJoyGroup,
        cw / 2 + 100,
        ch / 2 - 100,
        touchData.aimJoyX,
        touchData.aimJoyY,
        joyRadius,
        knobRadius,
        0xffc864,
        0.3
      );
    } else {
      this.aimJoyGroup.visible = false;
    }
  }

  private updateJoystick(
    group: THREE.Group,
    baseX: number,
    baseY: number,
    joyX: number,
    joyY: number,
    joyRadius: number,
    knobRadius: number,
    color: number,
    baseOpacity: number
  ): void {
    // Clear existing joystick
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    // Base circle
    const baseGeometry = new THREE.CircleGeometry(joyRadius, 32);
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: baseOpacity,
      side: THREE.DoubleSide,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(baseX, baseY, 0);
    group.add(base);

    // Knob circle
    const knobGeometry = new THREE.CircleGeometry(knobRadius, 32);
    const knobMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const knob = new THREE.Mesh(knobGeometry, knobMaterial);
    const knobX = baseX + joyX * joyRadius;
    const knobY = baseY - joyY * joyRadius; // Flip Y for screen space
    knob.position.set(knobX, knobY, 0.1);
    group.add(knob);
  }

  /**
   * Create a circular glow texture for fireballs and effects
   */
  private createGlowTexture(colorHex: number, size: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      // Fallback
      return new THREE.CanvasTexture(document.createElement('canvas'));
    }

    const centerX = size / 2;
    const centerY = size / 2;

    // Create radial gradient for soft glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 2);

    const color = new THREE.Color(colorHex);
    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);

    // Center is bright, edges fade to transparent
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
    gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.6)`);
    gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.2)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  dispose(): void {
    this.spriteManager.dispose();
    this.sceneManager.dispose();

    // Clear grid lines
    if (this.gridLines) {
      this.sceneManager.removeFromScene(this.gridLines);
      this.gridLines.geometry.dispose();
      (this.gridLines.material as THREE.Material).dispose();
      this.gridLines = null;
    }

    // Clear UI scene
    if (this.uiScene) {
      if (this.healthBar) {
        while (this.healthBar.children.length > 0) {
          const child = this.healthBar.children[0];
          this.healthBar.remove(child);
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        }
        this.uiScene.remove(this.healthBar);
        this.healthBar = null;
      }

      if (this.joyGroup) {
        while (this.joyGroup.children.length > 0) {
          const child = this.joyGroup.children[0];
          this.joyGroup.remove(child);
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        }
        this.uiScene.remove(this.joyGroup);
        this.joyGroup = null;
      }

      if (this.aimJoyGroup) {
        while (this.aimJoyGroup.children.length > 0) {
          const child = this.aimJoyGroup.children[0];
          this.aimJoyGroup.remove(child);
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        }
        this.uiScene.remove(this.aimJoyGroup);
        this.aimJoyGroup = null;
      }
    }

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

    // Clear fireball illumination views
    for (const fb of this.activeFireballIllums) {
      const view = this.fireballIllumViews.get(fb);
      if (view) {
        this.sceneManager.removeFromScene(view);
        view.material.dispose();
      }
    }
    this.activeFireballIllums.clear();

    // Clear active entity tracking
    this.activeEnemies.clear();
    this.activeProjectiles.clear();
    this.activeLoot.clear();
    this.activeFireballs.clear();
    this.activeObstacles.clear();
  }
}

// Singleton instance
export const threeRenderer = new ThreeRenderer();
