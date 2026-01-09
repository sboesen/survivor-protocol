import * as THREE from 'three';
import { CONFIG } from '../../config';
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
import type { ExtractionZone } from '../../types';
import { bubbleVertexShader } from './water/shaders/bubbleVertex';
import { bubbleFragmentShader } from './water/shaders/bubbleFragment';
import { flameConeVertexShader } from './shaders/flame/FlameConeVertex';
import { flameConeFragmentShader } from './shaders/flame/FlameConeFragment';

/**
 * Main Three.js renderer for game entities.
 * All gameplay elements including world, entities, and HUD are rendered via WebGL.
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
  private projectileViews: WeakMap<Projectile, THREE.Object3D> = new WeakMap();
  private lootViews: WeakMap<Loot, THREE.Group> = new WeakMap();
  private fireballViews: WeakMap<FireballProjectile, THREE.Group> = new WeakMap();
  private obstacleViews: Map<Obstacle, THREE.Group> = new Map();
  private flameConeViews: Map<string, THREE.Mesh> = new Map(); // Keyed by weaponId/source

  // Keep track of active entities for cleanup
  private activeEnemies = new Set<Enemy>();
  private activeProjectiles = new Set<Projectile>();
  private activeLoot = new Set<Loot>();
  private activeFireballs = new Set<FireballProjectile>();
  private activeObstacles = new Set<Obstacle>();
  private activeFlameCones: Set<string> = new Set();

  private extractionGroup: THREE.Group | null = null;
  private extractionRing: THREE.Mesh | null = null;
  private extractionCore: THREE.Mesh | null = null;

  // Player view and aim indicator
  private playerView: THREE.Group | null = null;
  private aimIndicator: THREE.Sprite | null = null;
  private aimIndicatorTexture: THREE.CanvasTexture | null = null;

  // Particles are recreated each frame
  private particleViews: THREE.Points[] = [];
  private particlesDisabled = false;

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

  private getInterpolatedPosition(
    entity: { x: number; y: number; prevX?: number; prevY?: number },
    alpha: number
  ): { x: number; y: number } {
    const prevX = entity.prevX ?? entity.x;
    const prevY = entity.prevY ?? entity.y;
    let dx = entity.x - prevX;
    let dy = entity.y - prevY;

    if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
    if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
    if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
    if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;

    const x = (prevX + dx * alpha + CONFIG.worldSize) % CONFIG.worldSize;
    const y = (prevY + dy * alpha + CONFIG.worldSize) % CONFIG.worldSize;
    return { x, y };
  }

  async init(): Promise<void> {
    if (!ThreeRenderer.enabled) return;
    this.sceneManager.init();
    await this.spriteManager.init();
    this.initUI();
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

  private initUI(): void {
    if (!ThreeRenderer.enabled) return;

    // Create UI scene and camera (fixed screen space)
    this.uiScene = new THREE.Scene();
    this.uiCamera = new THREE.OrthographicCamera(
      -window.innerWidth / 2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      -window.innerHeight / 2,
      0.1,
      100
    );
    this.uiCamera.position.z = 100;
    // Note: No Y-flip needed for UI camera - we handle coordinate conversion in screenToUI


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
    height: number,
    alpha = 1,
    aimAngle = 0,
    extractionZone: ExtractionZone | null = null
  ): void {
    if (!ThreeRenderer.enabled) return;

    const interpPlayer = player ? this.getInterpolatedPosition(player, alpha) : null;

    // Update camera to follow player
    if (interpPlayer) {
      this.cameraController.follow(interpPlayer.x, interpPlayer.y, width, height);
    }

    // Render background/grid after camera update
    this.renderBackground(interpPlayer);

    // Render all entities
    if (player && interpPlayer) {
      this.renderPlayer(player, interpPlayer.x, interpPlayer.y, aimAngle);
    }
    this.renderEnemies(enemies, alpha);
    this.renderProjectiles(projectiles, alpha);
    this.renderLoot(loot, alpha);
    this.renderFireballs(fireballs, alpha);
    this.renderParticles(particles, alpha);
    this.renderObstacles(obstacles);
    this.renderExtractionZone(extractionZone);
    if (player) {
      this.renderFlameCones(player, alpha, aimAngle);
    }
    this.renderIllumination(particles, fireballs, alpha);

    // Finally render the scene
    this.sceneManager.render();
  }

  private renderExtractionZone(zone: ExtractionZone | null): void {
    if (!zone || !zone.active) {
      if (this.extractionGroup) this.extractionGroup.visible = false;
      return;
    }

    this.ensureExtractionGroup();
    if (!this.extractionGroup) return;

    const { x, y } = this.cameraController.getWrappedRenderPosition(zone.x, zone.y);
    const pulse = 1 + Math.sin(Date.now() / 250) * 0.08;
    this.extractionGroup.position.set(x, y, 1);
    this.extractionGroup.scale.set(zone.radius * pulse, zone.radius * pulse, 1);
    this.extractionGroup.rotation.z = Date.now() / 1000;
    this.extractionGroup.visible = true;

    if (this.extractionRing) {
      const material = this.extractionRing.material as THREE.MeshBasicMaterial;
      material.opacity = 0.4 + Math.sin(Date.now() / 300) * 0.15;
    }

    if (this.extractionCore) {
      const material = this.extractionCore.material as THREE.MeshBasicMaterial;
      material.opacity = 0.12 + Math.cos(Date.now() / 400) * 0.06;
    }
  }

  private ensureExtractionGroup(): void {
    if (this.extractionGroup) return;

    const group = new THREE.Group();
    const ringGeometry = new THREE.RingGeometry(0.7, 1, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const coreGeometry = new THREE.CircleGeometry(0.7, 48);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.18,
    });

    this.extractionRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.extractionCore = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(this.extractionCore);
    group.add(this.extractionRing);
    group.visible = false;

    this.extractionGroup = group;
    this.sceneManager.addToScene(group);
  }

  renderIllumination(_particles: Particle[], fireballs: FireballProjectile[], alpha = 1): void {
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

      const interp = this.getInterpolatedPosition(fb, alpha);
      const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
      illumSprite.position.set(pos.x, pos.y, 1);

      // Flickering effect for illumination
      const flicker = 1 + (Math.random() - 0.5) * 0.1;
      const baseScale = fb.radius * 12;
      illumSprite.scale.set(baseScale * flicker, baseScale * flicker, 1);
      illumSprite.material.opacity = 0.4 + Math.sin(time * 10 + fb.x) * 0.1;

      illumSprite.visible = !fb.marked;
    }
  }

  private renderPlayer(player: Player | null, renderX: number, renderY: number, aimAngle: number): void {
    if (!player) return;

    if (!this.playerView) {
      // Player uses charId as sprite key
      this.playerView = this.spriteManager.getSpriteWithShadow(player.charId, player.radius * 2.5);
      this.sceneManager.addToScene(this.playerView);
    }

    if (!this.aimIndicator) {
      this.aimIndicatorTexture = this.createAimIndicatorTexture();
      const material = new THREE.SpriteMaterial({
        map: this.aimIndicatorTexture,
        transparent: true,
        opacity: 0.6,
        depthTest: false,
      });
      this.aimIndicator = new THREE.Sprite(material);
      // Brackets are smaller now (20% reduction from 30)
      this.aimIndicator.scale.set(24, 24, 1);
      this.sceneManager.addToScene(this.aimIndicator);
    }

    const pos = this.cameraController.getWrappedRenderPosition(renderX, renderY);
    this.playerView.position.set(pos.x, pos.y, 10);
    this.playerView.visible = true;

    // Update aim indicator position (offset further out) and rotation
    const distance = 28;
    this.aimIndicator.position.set(
      pos.x + Math.cos(aimAngle) * distance,
      pos.y + Math.sin(aimAngle) * distance,
      11
    );
    this.aimIndicator.material.rotation = -aimAngle;
    this.aimIndicator.visible = true;
  }

  private createAimIndicatorTexture(size: number = 64): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.strokeStyle = '#22ff66'; // Subtle green
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw > shape (centered in texture)
    const margin = size * 0.25;
    const width = size * 0.35;
    const centerX = size / 2;
    const centerY = size / 2;

    ctx.beginPath();
    ctx.moveTo(centerX - width / 2, margin);
    ctx.lineTo(centerX + width / 2, centerY);
    ctx.lineTo(centerX - width / 2, size - margin);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private renderEnemies(enemies: Enemy[], alpha: number): void {
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
      const interp = this.getInterpolatedPosition(enemy, alpha);
      const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
      view.position.set(pos.x, pos.y, 9);
      view.visible = !enemy.marked;
    }
  }

  private renderProjectiles(projectiles: Projectile[], alpha: number): void {
    // Clean up removed projectiles
    const currentSet = new Set(projectiles);
    for (const proj of this.activeProjectiles) {
      if (!currentSet.has(proj)) {
        const view = this.projectileViews.get(proj);
        if (view) {
          this.sceneManager.removeFromScene(view);
          if ((view as any).material) (view as any).material.dispose();
          if ((view as any).geometry) (view as any).geometry.dispose();
        }
        this.activeProjectiles.delete(proj);
      }
    }

    // Update or create projectile views
    for (const proj of projectiles) {
      if (proj.marked) continue;

      let view = this.projectileViews.get(proj);

      if (!view) {
        if (proj.spriteId) {
          const texture = this.spriteManager.getTexture(proj.spriteId);
          if (!texture) {
            console.error('[ThreeRenderer] Failed to get texture for:', proj.spriteId);
          }
          const material = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
          });
          view = new THREE.Sprite(material);
        } else if (proj.isBubble) {
          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.ShaderMaterial({
            uniforms: {
              uTime: { value: performance.now() / 1000 },
            },
            vertexShader: bubbleVertexShader,
            fragmentShader: bubbleFragmentShader,
            transparent: true,
            depthTest: false,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
          });
          view = new THREE.Mesh(geometry, material);
        } else {
          const material = new THREE.SpriteMaterial({
            color: new THREE.Color(proj.color),
            depthTest: false,
          });
          view = new THREE.Sprite(material);
        }

        // Use larger scale for sprite projectiles
        const scaleMultiplier = proj.spriteId ? 3.5 : 1.75;
        view.scale.set(proj.radius * scaleMultiplier, proj.radius * scaleMultiplier, 1);
        this.sceneManager.addToScene(view);
        this.projectileViews.set(proj, view);
        this.activeProjectiles.add(proj);
      }

      // Update scale for bubbles
      if (proj.isBubble) {
        // Age-based growth: start at 1.75x, grow to 3.25x over first 30 frames
        const growth = Math.min(1.0, proj.age / 30.0);
        const scale = proj.radius * (1.75 + growth * 1.5);
        view.scale.set(scale, scale, 1);

        if (view instanceof THREE.Mesh && view.material instanceof THREE.ShaderMaterial) {
          view.material.uniforms.uTime.value = performance.now() / 1000;
        }
      }

      // Update rotation for sprite projectiles
      if (proj.spriteId && view instanceof THREE.Sprite) {
        const velocityAngle = Math.atan2(proj.vy, proj.vx);
        // Arrow sprite points to top-right (45°); invert for Y-flipped camera, then offset.
        view.material.rotation = -velocityAngle - Math.PI / 4;
      }

      // Get wrapped render position
      const interp = this.getInterpolatedPosition(proj, alpha);
      const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
      view.position.set(pos.x, pos.y, 11);
      view.visible = !proj.marked;
    }
  }

  private renderLoot(loot: Loot[], alpha: number): void {
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
      const interp = this.getInterpolatedPosition(item, alpha);
      const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);

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

  private renderFireballs(fireballs: FireballProjectile[], alpha: number): void {
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
        core.scale.set(fb.radius * 2.4, fb.radius * 2.4, 1);
        core.position.z = 0.1;
        view.add(core);

        this.sceneManager.addToScene(view);
        this.fireballViews.set(fb, view);
        this.activeFireballs.add(fb);
      }

      const interp = this.getInterpolatedPosition(fb, alpha);
      const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
      view.position.set(pos.x, pos.y, 11);

      // Velocity stretching - move up to use for counter-scaling
      const speed = Math.hypot(fb.vx, fb.vy);
      let invSX = 1;
      let invSY = 1;

      if (speed > 0.1) {
        const stretch = 1 + speed * 0.06;
        const angle = Math.atan2(fb.vy, fb.vx);
        view.rotation.z = angle;
        view.scale.set(stretch, 1 / Math.sqrt(stretch), 1);
        invSX = 1 / view.scale.x;
        invSY = 1 / view.scale.y;
      } else {
        view.rotation.z = 0;
        view.scale.set(1, 1, 1);
      }

      // Dynamic pulsing - more subtle as requested
      const pulse = 1 + Math.sin(fb.pulsePhase) * 0.12;
      const secondaryPulse = Math.sin(fb.pulsePhase * 0.8);

      // Access children: 0: outer glow, 1: mid layer, 2: core
      const glow = view.children[0] as THREE.Sprite;
      const mid = view.children[1] as THREE.Sprite;
      const core = view.children[2] as THREE.Sprite;

      if (glow) {
        const glowScale = fb.radius * 6.5 * pulse;
        glow.scale.set(glowScale * invSX, glowScale * invSY, 1);
        glow.material.opacity = 0.35 + secondaryPulse * 0.1;
      }

      if (mid) {
        // Subtle churning
        const midSize = fb.radius * 3.2 * (1.1 - pulse * 0.1);
        mid.scale.set(midSize * invSX, midSize * invSY, 1);
        mid.material.rotation = -fb.rotation * 0.8;
        mid.material.opacity = 0.6 + secondaryPulse * 0.1;
      }

      if (core) {
        const coreSize = fb.radius * 2.6 * (1 + Math.sin(fb.pulsePhase * 1.5) * 0.1);
        core.scale.set(coreSize * invSX, coreSize * invSY, 1);
        core.material.rotation = fb.rotation * 0.6;
      }

      // Update trail if it exists (or add if needed)
      const currentTrailCount = view.children.filter(c => c.userData.isTrail).length;
      if (view.children.length >= 3 && currentTrailCount < fb.maxTrail) {
        for (let i = currentTrailCount; i < fb.maxTrail; i++) {
          const trailColor = i % 2 === 0 ? 0xff4400 : 0xffaa00;
          const trailTexture = this.createGlowTexture(trailColor, 32);
          const trailMaterial = new THREE.SpriteMaterial({
            map: trailTexture,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false, // Ensure trail is always visible
          });
          const trailSprite = new THREE.Sprite(trailMaterial);
          trailSprite.userData = { isTrail: true, index: i };
          view.add(trailSprite);
        }
      }

      // Position trail sprites relative to the head
      view.children.forEach(child => {
        if (child.userData.isTrail) {
          const trailIdx = child.userData.index;
          const trailPos = fb.trailPositions[trailIdx];
          if (trailPos) {
            child.visible = true;
            let dx = trailPos.x - fb.x;
            let dy = trailPos.y - fb.y;
            if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
            if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
            if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
            if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;

            const localX = dx * Math.cos(-view.rotation.z) - dy * Math.sin(-view.rotation.z);
            const localY = dx * Math.sin(-view.rotation.z) + dy * Math.cos(-view.rotation.z);

            // Adjust position and counter-act group scale for trail segments
            child.position.set(localX / view.scale.x, localY / view.scale.y, -0.5 - trailIdx * 0.1);

            const progress = trailIdx / fb.maxTrail;
            const life = 1 - progress;
            // Scale and opacity fading
            const trailBaseSize = fb.radius * (2.5 - progress * 1.5);
            child.scale.set(trailBaseSize / view.scale.x, trailBaseSize / view.scale.y, 1);
            (child as THREE.Sprite).material.opacity = 0.5 * life;
          } else {
            child.visible = false;
          }
        }
      });

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

  private renderParticles(particles: Particle[], alpha: number): void {
    // TEMP: Skip particles to fix lag
    if (this.particlesDisabled || particles.length === 0) return;

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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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
        uniforms: {
          uTime: { value: performance.now() / 1000 },
        },
        vertexShader: `
          uniform float uTime;
          attribute vec3 color;
          attribute float alpha;
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSize;
          varying float vOffset;
          
          void main() {
            vColor = color;
            vAlpha = alpha;
            vSize = size;
            vOffset = position.x + position.y; // Seed for individual animation
            
            // Jiggle effect
            float wobble = sin(uTime * 10.0 + vOffset) * 0.05 * size;
            vec3 newPos = position + vec3(wobble, wobble * 0.5, 0.0);
            
            vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
            gl_PointSize = (size + wobble) * 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec3 vColor;
            varying float vAlpha;
            varying float vSize;
            varying float vOffset;

            // Simple hash for noise
            float hash(vec2 p) {
              p = fract(p * vec2(123.34, 456.21));
              p += dot(p, p + 45.32);
              return fract(p.x * p.y);
            }

            // 2D Noise
            float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                         mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
            }

            // FBM for liquid look
            float fbm(vec2 p) {
              float v = 0.0;
              float a = 0.5;
              for (int i = 0; i < 2; i++) {
                v += a * noise(p);
                p *= 2.0;
                a *= 0.5;
              }
              return v;
            }

            void main() {
              vec2 coord = gl_PointCoord - vec2(0.5);
              float dist = length(coord) * 2.0;

              // Refractive Distortion
              float warp = (fbm(coord * 4.0 + uTime) - 0.5) * 0.2;
              float finalDist = dist + warp;
              
              if (finalDist > 1.0) discard;

              // Sharp Surface Rim
              float edge = smoothstep(1.0, 0.85, finalDist);
              float alpha = edge * vAlpha;
              
              // Iridescence (rainbow edges)
              vec3 rainbow = 0.5 + 0.5 * cos(uTime * 2.5 + finalDist * 6.0 + vec3(0, 2, 4));
              vec3 baseColor = mix(vColor, rainbow, smoothstep(0.85, 1.0, finalDist) * 0.3);

              // Specular Glints
              float spec = smoothstep(0.3, 0.0, length(coord - vec2(-0.2, -0.2))) * 0.5;
              vec3 finalColor = baseColor + spec;
              
              gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthTest: false,
        blending: THREE.AdditiveBlending,
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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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

  float progress = 1.0 - vLife;

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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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
        const interp = this.getInterpolatedPosition(pt, alpha);
        const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
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

    // Helper to add a grid line
    const addVerticalLine = (x: number) => {
      points.push(x, startWorldY, 0);
      points.push(x, endWorldY, 0);
    };

    const addHorizontalLine = (y: number) => {
      points.push(startWorldX, y, 0);
      points.push(endWorldX, y, 0);
    };

    // Calculate grid line positions with world wrapping support
    const points: number[] = [];

    // Vertical grid lines - handle wrapping
    const gridStartX = Math.floor(startWorldX / tileSize) * tileSize;
    const gridEndX = Math.ceil(endWorldX / tileSize) * tileSize;
    for (let worldX = gridStartX; worldX <= gridEndX; worldX += tileSize) {
      const lineX = worldX;
      addVerticalLine(lineX);
      // If this line is near a world boundary, also draw it wrapped
      if (Math.abs(lineX % CONFIG.worldSize) < tileSize) {
        addVerticalLine(lineX + CONFIG.worldSize);
        addVerticalLine(lineX - CONFIG.worldSize);
      }
    }

    // Horizontal grid lines - handle wrapping
    const gridStartY = Math.floor(startWorldY / tileSize) * tileSize;
    const gridEndY = Math.ceil(endWorldY / tileSize) * tileSize;
    for (let worldY = gridStartY; worldY <= gridEndY; worldY += tileSize) {
      const lineY = worldY;
      addHorizontalLine(lineY);
      // If this line is near a world boundary, also draw it wrapped
      if (Math.abs(lineY % CONFIG.worldSize) < tileSize) {
        addHorizontalLine(lineY + CONFIG.worldSize);
        addHorizontalLine(lineY - CONFIG.worldSize);
      }
    }

    if (!this.gridLines) {
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
    } else {
      this.gridLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      this.gridLines.geometry.attributes.position.needsUpdate = true;
    }
  }

  private renderFlameCones(player: Player, alpha: number, aimAngle: number): void {
    const lighter = player.weapons.find(w => w.id === 'lighter');
    this.activeFlameCones.clear();

    if (lighter && lighter.curCd > 0) {
      const weaponId = 'player_lighter';
      this.activeFlameCones.add(weaponId);

      let view = this.flameConeViews.get(weaponId);
      const intensity = 1.3;
      const spread = (lighter.spread || 0.6) * 0.8; // Visual spread refined
      const scaleValue = lighter.coneLength || 110;
      const colorSource = new THREE.Color('#ff8844');
      const colorCore = new THREE.Color('#ff4400');
      const colorEdge = new THREE.Color('#661100');

      if (!view) {
        // Plane is (1, 1). We'll offset it so the bottom center is the pivot
        const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
        geometry.translate(0, 0.5, 0); // Pivot at bottom center

        const material = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uSpread: { value: spread },
            uIntensity: { value: intensity },
            uColorSource: { value: colorSource },
            uColorCore: { value: colorCore },
            uColorEdge: { value: colorEdge },
          },
          vertexShader: flameConeVertexShader,
          fragmentShader: flameConeFragmentShader,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        });
        view = new THREE.Mesh(geometry, material);
        view.frustumCulled = false;
        view.renderOrder = 999;
        this.sceneManager.addToScene(view);
        this.flameConeViews.set(weaponId, view);
      }

      // Update position, rotation, and sync scale with coneLength
      view.scale.set(scaleValue, scaleValue, 1);
      const interp = this.getInterpolatedPosition(player, alpha);
      const pos = this.cameraController.getWrappedRenderPosition(interp.x, interp.y);
      view.position.set(pos.x, pos.y, 10); // Normal Z depth

      // Orientation (aim angle)
      view.rotation.z = aimAngle - Math.PI / 2;

      // Uniforms
      if (view.material instanceof THREE.ShaderMaterial) {
        view.material.uniforms.uTime.value = performance.now() / 1000;
        view.material.uniforms.uSpread.value = spread;
        view.material.uniforms.uIntensity.value = intensity;
      }
      view.visible = true;
    }

    // Cleanup inactive flame cones
    for (const [id, view] of this.flameConeViews.entries()) {
      if (!this.activeFlameCones.has(id)) {
        view.visible = false;
        // Optionally dispose after a timeout
      }
    }
  }

  /**
    * Draw UI elements (health bar, joysticks) using Three.js
     */
  renderUI(
    playerHp: number,
    playerMaxHp: number,
    playerX: number,
    playerY: number,
    touchData: {
      hasTouch: boolean;
      joyActive: boolean;
      joyX: number;
      joyY: number;
      joyOx: number;
      joyOy: number;
      aimJoyActive: boolean;
      aimJoyX: number;
      aimJoyY: number;
      aimJoyOx: number;
      aimJoyOy: number;
    },
    width: number,
    height: number
  ): void {
    if (!this.uiCamera || !this.uiScene) return;

    const cw = width;
    const ch = height;

    // Update health bar
    this.renderHealthBar(playerHp, playerMaxHp, playerX, playerY, cw, ch);

    // Update joysticks
    this.renderJoysticks(touchData, cw, ch);

    // Render UI scene on top of everything
    this.sceneManager.renderer.render(this.uiScene, this.uiCamera);
  }

  private renderHealthBar(playerHp: number, playerMaxHp: number, playerX: number, playerY: number, _cw: number, ch: number): void {
    if (!this.healthBar) return;

    if (playerMaxHp <= 0) {
      this.healthBar.visible = false;
      return;
    }

    this.healthBar.visible = true;

    const hpPct = Math.max(0, playerHp / playerMaxHp);

    // Convert player world position to screen position
    const screenPos = this.cameraController.worldToScreen(playerX, playerY, _cw, ch);

    // Position health bar below player sprite (player is ~30px tall)
    // Convert from screen coords where Y increases downward to UI coords where Y increases upward
    const barX = screenPos.x - _cw / 2;
    const barY = ch / 2 - screenPos.y - 25; // Below player in screen space means lower Y in UI space

    const barWidth = 30;
    const barHeight = 4;

    // Create health bar meshes once if they don't exist
    let bg = this.healthBar.children[0] as THREE.Mesh;
    let health = this.healthBar.children[1] as THREE.Mesh;

    if (!bg) {
      const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
      const bgMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
      bg = new THREE.Mesh(bgGeometry, bgMaterial);
      bg.position.z = 0;
      this.healthBar.add(bg);
    }

    if (!health) {
      const healthGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
      const healthMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
      health = new THREE.Mesh(healthGeometry, healthMaterial);
      health.position.z = 0.1;
      this.healthBar.add(health);
    }

    // Update position and health width
    bg.position.set(barX, barY, 0);
    const healthWidth = barWidth * hpPct;
    health.scale.set(hpPct, 1, 1);
    health.position.set(barX - (barWidth - healthWidth) / 2, barY, 0.1);
    health.visible = healthWidth > 0;
  }

  private renderJoysticks(touchData: {
    hasTouch: boolean;
    joyActive: boolean;
    joyX: number;
    joyY: number;
    joyOx: number;
    joyOy: number;
    aimJoyActive: boolean;
    aimJoyX: number;
    aimJoyY: number;
    aimJoyOx: number;
    aimJoyOy: number;
  }, cw: number, ch: number): void {
    if (!this.joyGroup || !this.aimJoyGroup) return;

    const joyRadius = 50;
    const knobRadius = 20;

    // Convert screen coordinates to UI camera coordinates
    // Screen: (0,0) is top-left, Y increases downward
    // UI Camera: (0,0) is center, Y increases upward (standard OpenGL convention)
    const screenToUI = (screenX: number, screenY: number) => ({
      x: screenX - cw / 2,
      y: ch / 2 - screenY,
    });

    // Movement joystick (left) - renders at touch origin
    if (touchData.joyActive) {
      this.joyGroup.visible = true;
      const joyPos = screenToUI(touchData.joyOx, touchData.joyOy);
      this.updateJoystick(
        this.joyGroup,
        joyPos.x,
        joyPos.y,
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

    // Aim joystick (right) - renders at touch origin
    if (touchData.aimJoyActive) {
      this.aimJoyGroup.visible = true;
      const aimPos = screenToUI(touchData.aimJoyOx, touchData.aimJoyOy);
      this.updateJoystick(
        this.aimJoyGroup,
        aimPos.x,
        aimPos.y,
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
    let base = group.children[0] as THREE.Mesh;
    let knob = group.children[1] as THREE.Mesh;

    if (!base) {
      const baseGeometry = new THREE.CircleGeometry(joyRadius, 32);
      const baseMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: baseOpacity,
        side: THREE.DoubleSide,
      });
      base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.z = 0;
      group.add(base);
    }

    if (!knob) {
      const knobGeometry = new THREE.CircleGeometry(knobRadius, 32);
      const knobMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      knob = new THREE.Mesh(knobGeometry, knobMaterial);
      knob.position.z = 0.1;
      group.add(knob);
    }

    // Update positions
    base.position.set(baseX, baseY, 0);
    const knobX = baseX + joyX * joyRadius;
    const knobY = baseY - joyY * joyRadius;
    knob.position.set(knobX, knobY, 0.1);
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

    if (this.aimIndicatorTexture) {
      this.aimIndicatorTexture.dispose();
      this.aimIndicatorTexture = null;
    }

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
