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
import type { ScreenPosition } from '../../entities/entity';

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
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    if (!ThreeRenderer.enabled) return;
    this.sceneManager.init(canvas);
    await this.spriteManager.init();
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

  /**
   * Render ground illumination effects (fire glow, etc.)
   * Call this after renderBackgroundCanvas but before Three.js sprites
   */
  renderIllumination(
    ctx: CanvasContext,
    particles: Particle[],
    fireballs: FireballProjectile[],
    _playerX: number,
    _playerY: number,
    cw: number,
    ch: number
  ): void {
    if (!ctx) return;

    const camera = this.sceneManager.camera;
    const camX = camera.position.x;
    const camY = camera.position.y;
    const halfWidth = (camera.right - camera.left) / 2;
    const halfHeight = (camera.top - camera.bottom) / 2;

    const pixelsPerUnitX = cw / (halfWidth * 2);
    const pixelsPerUnitY = ch / (halfHeight * 2);

    // Get time for pulsing effects
    const time = Date.now() / 1000;

    // Enable additive blending for glow effect
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Render fireball ground illumination
    for (const fb of fireballs) {
      if (fb.marked) continue;

      // Get wrapped offset for screen space rendering
      const offset = this.cameraController.getWrappedOffset(fb.x, fb.y);
      const sx = offset.dx * pixelsPerUnitX + cw / 2;
      const sy = ch / 2 + offset.dy * pixelsPerUnitY;

      // Culling
      if (sx < -150 || sx > cw + 150 || sy < -150 || sy > ch + 150) continue;

      // Pulsing glow
      const pulseScale = 1 + Math.sin(time * 5 + fb.x) * 0.3;
      const illumRadius = fb.radius * 12 * pulseScale * pixelsPerUnitX;

      // Outer glow gradient
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, illumRadius);
      gradient.addColorStop(0, 'rgba(255, 200, 100, 0.5)');
      gradient.addColorStop(0.2, 'rgba(255, 150, 50, 0.3)');
      gradient.addColorStop(0.5, 'rgba(255, 100, 30, 0.15)');
      gradient.addColorStop(0.8, 'rgba(255, 60, 10, 0.05)');
      gradient.addColorStop(1, 'rgba(255, 30, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sx, sy, illumRadius, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      const coreRadius = fb.radius * 4 * pixelsPerUnitX;
      const coreGradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreRadius);
      coreGradient.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
      coreGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.2)');
      coreGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(sx, sy, coreRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render fire particle illumination
    for (const pt of particles) {
      if (pt.marked || pt.type !== 'fire') continue;

      let rx = pt.x - camX;
      let ry = pt.y - camY;

      // Fire particles don't wrap
      if (Math.abs(rx) > halfWidth * 1.5 || Math.abs(ry) > halfHeight * 1.5) continue;

      const sx = rx * pixelsPerUnitX + cw / 2;
      const sy = ch / 2 + ry * pixelsPerUnitY;

      // Culling
      if (sx < -100 || sx > cw + 100 || sy < -100 || sy > ch + 100) continue;

      const alpha = Math.max(0, pt.life / pt.maxLife);
      const illumRadius = pt.size * 8 * pixelsPerUnitX;

      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, illumRadius);
      gradient.addColorStop(0, `rgba(255, 150, 50, ${alpha * 0.4})`);
      gradient.addColorStop(0.5, `rgba(255, 80, 20, ${alpha * 0.15})`);
      gradient.addColorStop(1, 'rgba(255, 30, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sx, sy, illumRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
    const fireParticles: Particle[] = [];
    const otherParticles: Particle[] = [];

    for (const pt of particles) {
      if (pt.marked) continue;
      if (pt.type === 'water' || pt.type === 'foam' || pt.type === 'ripple' || pt.type === 'caustic' || pt.type === 'splash') {
        waterParticles.push(pt);
      } else if (pt.type === 'fire') {
        fireParticles.push(pt);
      } else {
        otherParticles.push(pt);
      }
    }

    // Render water particles with sprite textures (circles with highlights)
    if (waterParticles.length > 0) {
      const positions = new Float32Array(waterParticles.length * 3);
      const colors = new Float32Array(waterParticles.length * 3);
      const alphas = new Float32Array(waterParticles.length);

      for (let i = 0; i < waterParticles.length; i++) {
        const pt = waterParticles[i];
        // Get wrapped render position
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 13; // Z position

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.max(0, pt.life / pt.maxLife) * 0.8;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Create shader material for circular water particles with highlight
      const material = new THREE.ShaderMaterial({
        uniforms: {
          pointSize: { value: 8.0 }
        },
        vertexShader: `
          attribute vec3 color;
          varying vec3 vColor;
          varying float vAlpha;
          uniform float pointSize;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = pointSize * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          uniform float pointSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;

            // Create water droplet effect with highlight
            float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
            float highlight = smoothstep(0.35, 0.0, dist) * 0.5;

            vec3 finalColor = vColor + vec3(highlight);
            gl_FragColor = vec4(finalColor, alpha * 0.8);
          }
        `,
        transparent: true,
        depthTest: false,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Render fire particles with life-based color transition
    if (fireParticles.length > 0) {
      const positions = new Float32Array(fireParticles.length * 3);
      const lives = new Float32Array(fireParticles.length);

      for (let i = 0; i < fireParticles.length; i++) {
        const pt = fireParticles[i];
        // Get wrapped render position
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 12; // Z position
        // Life progress (0 = dead, 1 = full life)
        lives[i] = Math.max(0, pt.life / pt.maxLife);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('life', new THREE.BufferAttribute(lives, 1));

      // Fire particle shader with dramatic color transition
      const material = new THREE.ShaderMaterial({
        uniforms: {
          pointSize: { value: 5.0 }  // Smaller particles
        },
        vertexShader: `
          attribute float life;
          varying float vLife;
          uniform float pointSize;
          void main() {
            vLife = life;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = pointSize * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying float vLife;
          uniform float pointSize;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);

            // Circular particle with soft edge
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            if (alpha < 0.01) discard;

            // Dramatic 4-stage color transition
            // Stage 1 (1.0 - 0.7): Bright yellow-white - NEW/HOT
            // Stage 2 (0.7 - 0.4): Orange - COOLING
            // Stage 3 (0.4 - 0.2): Dark red - DYING
            // Stage 4 (0.2 - 0.0): Grey ash - SMOKE

            vec3 brightHot = vec3(1.0, 1.0, 0.7);   // Bright yellow-white
            vec3 hotColor = vec3(1.0, 0.5, 0.0);    // Orange
            vec3 coolColor = vec3(0.5, 0.0, 0.0);   // Dark red
            vec3 smokeColor = vec3(0.25, 0.25, 0.3); // Blue-ish grey (visible!)

            vec3 finalColor;
            if (vLife > 0.7) {
              // Bright yellow to orange
              float t = (vLife - 0.7) / 0.3;
              finalColor = mix(hotColor, brightHot, t);
              // Add bright core for new particles
              float core = smoothstep(0.5, 0.0, dist) * 0.5 * vLife;
              finalColor += vec3(core);
            } else if (vLife > 0.4) {
              // Orange to red
              float t = (vLife - 0.4) / 0.3;
              finalColor = mix(coolColor, hotColor, t);
            } else if (vLife > 0.2) {
              // Red to dark red
              float t = (vLife - 0.2) / 0.2;
              finalColor = mix(vec3(0.2, 0.0, 0.0), coolColor, t);
            } else {
              // Dark red to grey smoke - THIS IS THE KEY TRANSITION
              float t = vLife / 0.2;
              finalColor = mix(smokeColor, vec3(0.2, 0.0, 0.0), t);
              // NO bright core for smoke - makes it look dull/grey
            }

            // Fade overall alpha with life
            alpha *= smoothstep(0.0, 0.2, vLife);

            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
        // Use normal blending so grey smoke is visible
        blending: THREE.NormalBlending,
      });

      const points = new THREE.Points(geometry, material);
      this.sceneManager.addToScene(points);
      this.particleViews.push(points);
    }

    // Render other particles (simple circles)
    if (otherParticles.length > 0) {
      const positions = new Float32Array(otherParticles.length * 3);
      const colors = new Float32Array(otherParticles.length * 3);

      for (let i = 0; i < otherParticles.length; i++) {
        const pt = otherParticles[i];
        // Get wrapped render position
        const pos = this.cameraController.getWrappedRenderPosition(pt.x, pt.y);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = 12;

        const color = new THREE.Color(pt.color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          pointSize: { value: 6.0 }
        },
        vertexShader: `
          attribute vec3 color;
          varying vec3 vColor;
          uniform float pointSize;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = pointSize * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
            gl_FragColor = vec4(vColor, alpha * 0.8);
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
    const halfWidth = (camera.right - camera.left) / 2;
    const halfHeight = (camera.top - camera.bottom) / 2;

    // Calculate screen-to-world ratio (pixels per world unit)
    const pixelsPerUnitX = cw / (halfWidth * 2);
    const pixelsPerUnitY = ch / (halfHeight * 2);

    for (const obs of obstacles) {
      // Get wrapped offset for screen space rendering
      const offset = this.cameraController.getWrappedOffset(obs.x, obs.y);
      // Convert to screen coordinates
      const sx = offset.dx * pixelsPerUnitX + cw / 2;
      const sy = ch / 2 + offset.dy * pixelsPerUnitY;

      // Culling
      if (sx < -100 || sx > cw + 100 || sy < -100 || sy > ch + 100) continue;

      // Draw obstacle shape
      obs.drawShape(ctx, { sx, sy } as ScreenPosition);
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
