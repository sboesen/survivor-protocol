import { CONFIG } from './config';
import { Utils } from './utils';
import { CHARACTERS } from './data/characters';
import { UPGRADES } from './data/upgrades';
import { SaveData } from './systems/saveData';
import { UI } from './systems/ui';
import { Menu } from './systems/menu';
import { GachaAnim } from './systems/gacha';
import { calculateGameOverRewards } from './systems/scoring';
import { calculateSpawn } from './systems/spawning';
import {
  isLootInRange,
  calculateLootMagnetPosition,
  canCollectLoot,
  calculateLootEffect,
  applyLootEffectToPlayer,
} from './systems/lootCollection';
import {
  calculateTimeState,
  calculateUltCharge,
  decrementTimeFreeze,
  decrementUltActiveTime,
  shouldUpdateHud,
} from './systems/timeManager';
import { processPlayerMovement } from './systems/movement';
import { fireWeapon, calculateWeaponDamage, decrementCooldown } from './systems/weapons';
import {
  calculateLootDrop,
  calculateChestGold,
  calculateExplosionParticles,
  calculateDeathExplosionSize,
  calculateBubbleSplit,
  findEnemiesInExplosion,
  findEnemiesNearPoint,
  applyKnockback,
} from './systems/combat';
import {
  hasDamageImmunity,
  calculateRebootHeal,
  getUltConfig,
  calculateGreaseFireProjectiles,
  getTimeFreezeDuration,
} from './systems/ultimates';
import { selectUpgradeChoices } from './systems/levelUp';
import {
  isValidParticleType,
  calculateParticleSpawnCount,
  canSpawnParticles,
} from './systems/particleSpawning';
import {
  calculateJoystickParams,
  JOYSTICK_COLORS,
} from './systems/rendering';
import { threeRenderer } from './renderer/three';
import { Player } from './entities/player';
import { Enemy } from './entities/enemy';
import { Projectile } from './entities/projectile';
import { FireballProjectile } from './entities/fireballProjectile';
import { Loot } from './entities/loot';
import { Obstacle } from './entities/obstacle';
import { Particle, type ParticleSpawnConfig, type ParticleType } from './entities/particle';
import type { InputState, DamageText } from './types';

class GameCore {
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;

  // Debug stats
  private fps: number = 60;
  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  active = false;
  paused = false;
  frames = 0;
  time = 0;
  mins = 0;
  goldRun = 0;
  kills = 0;
  bossKills = 0;
  lastTime = 0;
  accumulator = 0;
  readonly timestep = 1000 / 60; // 60 FPS fixed timestep

  player: Player | null = null;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  fireballs: FireballProjectile[] = [];
  loot: Loot[] = [];
  obstacles: Obstacle[] = [];
  damageTexts: DamageText[] = [];
  particles: Particle[] = [];

  input: InputState = {
    x: 0,
    y: 0,
    keys: {},
    joy: { active: false, x: 0, y: 0, ox: 0, oy: 0 },
    aimJoy: { active: false, x: 0, y: 0, ox: 0, oy: 0 },
    ult: false
  };

  timeFreeze = 0;

  async init(): Promise<void> {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    // Initialize Three.js renderer (async for image loading)
    await threeRenderer.init(this.canvas);

    this.resize();
    window.onresize = () => this.resize();

    SaveData.load();
    GachaAnim.init();

    // Keyboard input
    window.onkeydown = (e) => {
      this.input.keys[e.key] = true;
      if (e.key.toLowerCase() === 'z') this.triggerUlt();
    };
    window.onkeyup = (e) => {
      this.input.keys[e.key] = false;
    };

    // Mouse aim tracking - updates aim angle based on cursor position relative to player
    window.onmousemove = (e) => {
      if (!this.canvas || !this.player) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // Calculate angle from center of screen (player position) to mouse
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      this.input.aimAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
      // Deactivate aim joystick when using mouse
      this.input.aimJoy.active = false;
    };

    // Touch/joystick input - split into two zones
    const tz = this.canvas;
    const getCanvasPos = (clientX: number, clientY: number) => {
      const rect = tz.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };
    tz.ontouchstart = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const pos = getCanvasPos(touch.clientX, touch.clientY);
        const halfWidth = window.innerWidth / 2;
        if (touch.clientX < halfWidth) {
          // Left side: movement joystick
          this.input.joy.active = true;
          this.input.joy.ox = pos.x;
          this.input.joy.oy = pos.y;
        } else {
          // Right side: aim joystick
          this.input.aimJoy.active = true;
          this.input.aimJoy.ox = pos.x;
          this.input.aimJoy.oy = pos.y;
        }
      }
    };
    tz.ontouchmove = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const pos = getCanvasPos(touch.clientX, touch.clientY);
        const halfWidth = window.innerWidth / 2;
        if (touch.clientX < halfWidth) {
          // Left side: movement joystick
          if (!this.input.joy.active) continue;
          const dx = pos.x - this.input.joy.ox;
          const dy = pos.y - this.input.joy.oy;
          const dist = Math.hypot(dx, dy);
          const scale = Math.min(dist, 50) / 50;
          const angle = Math.atan2(dy, dx);
          this.input.joy.x = Math.cos(angle) * scale;
          this.input.joy.y = Math.sin(angle) * scale;
        } else {
          // Right side: aim joystick
          if (!this.input.aimJoy.active) continue;
          const dx = pos.x - this.input.aimJoy.ox;
          const dy = pos.y - this.input.aimJoy.oy;
          const angle = Math.atan2(dy, dx);
          this.input.aimJoy.x = Math.cos(angle);
          this.input.aimJoy.y = Math.sin(angle);
          this.input.aimAngle = angle;
        }
      }
    };
    tz.ontouchend = (e) => {
      for (const touch of e.changedTouches) {
        const halfWidth = window.innerWidth / 2;
        if (touch.clientX < halfWidth) {
          // Left side: movement joystick
          this.input.joy.active = false;
          this.input.joy.x = 0;
          this.input.joy.y = 0;
        } else {
          // Right side: aim joystick
          this.input.aimJoy.active = false;
          this.input.aimJoy.x = 0;
          this.input.aimJoy.y = 0;
        }
      }
    };

    Menu.renderCharSelect();
    requestAnimationFrame(() => this.loop());
  }

  resize(): void {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      threeRenderer.resize(window.innerWidth, window.innerHeight);
    }
  }

  start(): void {
    const menuScreen = document.getElementById('menu-screen');
    const gameOverScreen = document.getElementById('gameover-screen');

    if (menuScreen) menuScreen.classList.remove('active');
    if (gameOverScreen) gameOverScreen.classList.remove('active');

    this.active = true;
    this.paused = false;
    this.frames = 0;
    this.time = 0;
    this.mins = 0;
    this.goldRun = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.timeFreeze = 0;
    this.lastTime = 0;
    this.accumulator = 0;

    // Create player based on selected character
    const char = CHARACTERS[SaveData.data.selectedChar];
    if (!char) return;

    this.player = new Player(
      char.id,
      char.hpMod,
      char.spdMod,
      char.weapon,
      char.ult,
      SaveData.data.shop
    );

    this.enemies = [];
    this.projectiles = [];
    this.fireballs = [];
    this.loot = [];
    // Clear any existing damage text DOM elements
    for (const dt of this.damageTexts) {
      dt.el.remove();
    }
    this.damageTexts = [];
    this.particles = [];
    this.obstacles = [];

    const spawnX = CONFIG.worldSize / 2;
    const spawnY = CONFIG.worldSize / 2;
    const safeZone = 200; // Keep area around spawn clear

    // Generate obstacles (away from spawn point and each other)
    for (let i = 0; i < 40; i++) {
      let ox = 0, oy = 0, ow = 80, od = 80;
      let attempts = 0;
      let valid = false;
      const maxAttempts = 50;

      while (!valid && attempts < maxAttempts) {
        ox = Utils.rand(0, CONFIG.worldSize);
        oy = Utils.rand(0, CONFIG.worldSize);
        ow = Utils.rand(60, 150);
        od = Utils.rand(60, 150);
        attempts++;

        // Check safe zone around spawn
        if (Utils.getDist(ox, oy, spawnX, spawnY) < safeZone + 80) continue;

        // Check collision with existing obstacles
        let overlaps = false;
        for (const existing of this.obstacles) {
          const dist = Utils.getDist(ox, oy, existing.x, existing.y);
          const minDist = (ow + existing.w) / 2 + 80; // Buffer zone
          if (dist < minDist) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) valid = true;
      }

      if (valid) {
        this.obstacles.push(new Obstacle(ox, oy, ow, od, 'ruin'));
      }
    }

    UI.updateHud(0, 0, 1, 0, char.id, 0, 0);

    // Warm up JIT by running common code paths
    this.warmupAll();
  }

  private warmupFireball(): void {
    // Pre-compile fireball code to prevent first-shot lag
    const fb = new FireballProjectile(0, 0, 100, 100, 5, 10, 60, 1, false);
    for (let i = 0; i < 5; i++) fb.update();
    fb.shouldEmitTrail();
    fb.getTrailParticleCount();
    fb.getExplosionParticleCount();
  }

  private warmupAll(): void {
    // Warm up all commonly-used code paths to prevent JIT stutters
    this.warmupFireball();

    // Warm up regular projectiles
    const proj = new Projectile(0, 0, 1, 1, 5, '#fff', 10, 10, 1, false);
    proj.update();

    // Warm up particles (all types)
    const particleTypes: ParticleType[] = ['water', 'explosion', 'smoke', 'blood', 'spark', 'foam', 'ripple', 'caustic', 'splash', 'fire', 'gas'];
    for (const type of particleTypes) {
      const p = new Particle({ type, x: 0, y: 0 });
      p.update();
    }

    // Warm up enemy
    const dummyPlayer = new Player('janitor', 1, 1, 'bubble_stream', 'ClosingTime', { health: 0, speed: 0, magnet: 0, damage: 0 });
    const enemy = new Enemy(1000, 1000, 'basic', 0);
    enemy.update(dummyPlayer, 0, []);

    // Warm up loot (draw to compile that path)
    const loot = new Loot(0, 0, 'gem');
    loot.draw(this.ctx!, 0, 0, 800, 600);
  }

  quitRun(): void {
    this.gameOver(true);
  }

  gameOver(success = false): void {
    this.active = false;

    const rewards = calculateGameOverRewards({
      goldRun: this.goldRun,
      mins: this.mins,
      kills: this.kills,
      bossKills: this.bossKills,
    });

    SaveData.data.gold += rewards.total;
    SaveData.save();

    UI.showGameOverScreen(success, this.goldRun, this.mins, this.kills, this.bossKills);
  }

  returnToMenu(): void {
    const gameOverScreen = document.getElementById('gameover-screen');
    const menuScreen = document.getElementById('menu-screen');

    if (gameOverScreen) gameOverScreen.classList.remove('active');
    if (menuScreen) menuScreen.classList.add('active');

    Menu.renderCharSelect();
  }

  triggerUlt(): void {
    if (!this.active || this.paused || !this.player) return;

    if (this.player.ultCharge >= this.player.ultMax) {
      this.player.ultCharge = 0;
      const type = this.player.ultName;
      const config = getUltConfig(type);

      if (!config) return;

      this.spawnDamageText(this.player.x, this.player.y, config.text, config.color);

      switch (type) {
        case 'Security':
        case 'Ollie':
        case 'Reboot':
          this.player.ultActiveTime = config.duration;
          break;
        case 'ClosingTime':
          this.timeFreeze = getTimeFreezeDuration();
          break;
        case 'GreaseFire':
          const projectiles = calculateGreaseFireProjectiles(this.player.x, this.player.y);
          for (const projData of projectiles) {
            const proj = new Projectile(
              this.player.x,
              this.player.y,
              projData.vx,
              projData.vy,
              projData.damage,
              projData.color,
              projData.duration,
              100,
              projData.pierce,
              true
            );
            proj.isArc = true;
            this.projectiles.push(proj);
          }
          break;
      }

      // Reboot also heals
      if (type === 'Reboot') {
        this.player.hp = calculateRebootHeal(this.player.hp, this.player.maxHp);
      }
    }
  }

  spawnDamageText(wx: number, wy: number, txt: string | number, color = '#fff', isCrit = false): void {
    const el = UI.spawnDamageText(wx, wy, txt, color, isCrit);
    this.damageTexts.push({ el, wx, wy, life: 50 });
  }

  spawnParticles(config: ParticleSpawnConfig, count = 1): void {
    // Check if particle type is valid
    if (!isValidParticleType(config.type)) return;

    // Check if we can spawn more particles
    if (!canSpawnParticles(this.particles.length)) return;

    // Calculate actual count based on available space
    const actualCount = calculateParticleSpawnCount(count, this.particles.length);

    for (let i = 0; i < actualCount; i++) {
      this.particles.push(new Particle(config));
    }
  }

  spawnExplosion(x: number, y: number, size = 1): void {
    const particles = calculateExplosionParticles(size);
    this.spawnParticles({ type: 'explosion' as ParticleType, x, y }, particles.explosion);
    this.spawnParticles({ type: 'smoke', x, y }, particles.smoke);
  }

  update(): void {
    if (!this.active || this.paused || !this.player) return;

    const p = this.player; // Non-null assertion after check

    this.frames++;

    // Time tracking
    const timeState = calculateTimeState(this.frames);
    this.time = timeState.time;
    this.mins = timeState.mins;
    p.ultCharge = calculateUltCharge(this.frames, p.ultCharge, p.ultMax);

    // Ultimate cooldown
    this.timeFreeze = decrementTimeFreeze(this.timeFreeze);
    p.ultActiveTime = decrementUltActiveTime(p.ultActiveTime);

    // Aura animation frame tracking
    p.auraAttackFrame++;

    // Player movement
    const movementResult = processPlayerMovement(
      p.x, p.y,
      this.input,
      p.speed,
      p.ultName,
      p.ultActiveTime,
      this.obstacles
    );
    p.x = movementResult.x;
    p.y = movementResult.y;
    this.input.lastDx = movementResult.lastDx;
    this.input.lastDy = movementResult.lastDy;

    // Enemy spawning
    const spawnDecision = calculateSpawn({
      frames: this.frames,
      time: this.time,
      mins: this.mins,
      timeFreeze: this.timeFreeze,
      hasExistingBoss: this.enemies.some(e => e.type === 'boss'),
    });

    if (spawnDecision.shouldSpawn && spawnDecision.type) {
      this.enemies.push(new Enemy(p.x, p.y, spawnDecision.type, this.mins, this.obstacles));
    }

    // Weapons
    p.weapons.forEach(w => {
      if (w.curCd > 0) {
        w.curCd = decrementCooldown(
          w.curCd,
          p.items.cooldown,
          p.ultName === 'Ollie' && p.ultActiveTime > 0
        );
      }

      const damageResult = calculateWeaponDamage(w.baseDmg, p.dmgMult, p.critChance);
      const dmg = damageResult.damage;
      const isCrit = damageResult.isCrit;

      // Handle aura separately (returns early)
      if (w.type === 'aura' && w.area) {
        const result = fireWeapon('aura', w.id, { x: p.x, y: p.y }, this.enemies, w, dmg, isCrit, 1 + p.items.pierce, this.input.lastDx, this.input.lastDy, this.input.aimAngle, this.frames, p.items.projectile);
        if (result.fired && result.auraDamage) {
          p.auraAttackFrame = 0;
          this.enemies.forEach(e => {
            if (Utils.getDist(p.x, p.y, e.x, e.y) < result.auraDamage!.area) {
              this.hitEnemy(e, result.auraDamage!.dmg, result.auraDamage!.isCrit);
            }
          });
        }
        return;
      }

      if (w.curCd <= 0) {
        const result = fireWeapon(w.type, w.id, { x: p.x, y: p.y }, this.enemies, w, dmg, isCrit, 1 + p.items.pierce, this.input.lastDx, this.input.lastDy, this.input.aimAngle, this.frames, p.items.projectile);

        if (result.fired) {
          // Create projectiles from result data
          if (result.projectiles) {
            for (const projData of result.projectiles) {
              const proj = new Projectile(
                projData.x,
                projData.y,
                projData.vx,
                projData.vy,
                projData.radius,
                projData.color,
                projData.dmg,
                projData.duration,
                projData.pierce,
                projData.isCrit
              );
              if (projData.isBubble) (proj as any).isBubble = true;
              if (projData.splits) (proj as any).splits = true;
              if (projData.isArc) (proj as any).isArc = true;
              if (projData.explodeRadius) proj.explodeRadius = projData.explodeRadius;
              if (projData.knockback) proj.knockback = projData.knockback;
              this.projectiles.push(proj);
            }
          }

          // Create fireballs from result data
          if (result.fireballs) {
            for (const fbData of result.fireballs) {
              const fireball = new FireballProjectile(
                fbData.startX,
                fbData.startY,
                fbData.targetX,
                fbData.targetY,
                fbData.speed,
                fbData.dmg,
                fbData.duration,
                fbData.pierce,
                fbData.isCrit
              );
              if (fbData.explodeRadius) fireball.explodeRadius = fbData.explodeRadius;
              if (fbData.trailDamage) fireball.trailDamage = fbData.trailDamage;
              this.fireballs.push(fireball);
            }
          }

          // Handle spray weapon effects
          if (result.spray) {
            const { baseAngle, isLighter, gasColor, pelletCount, spreadAmount, coneLength } = result.spray;

            // Spawn gas cloud particles
            for (let i = 0; i < (isLighter ? 10 : 6); i++) {
              const dist = 10 + Math.random() * (isLighter ? 50 : 80);
              let gasSpread = isLighter ? spreadAmount * 0.3 : spreadAmount;
              if (isLighter) {
                const distFactor = (dist - 10) / 50;
                gasSpread = spreadAmount * (0.15 + distFactor * 0.3);
              }
              const spreadAngle = baseAngle + (Math.random() - 0.5) * gasSpread;
              this.spawnParticles({
                type: 'gas' as ParticleType,
                x: p.x + Math.cos(spreadAngle) * dist + (Math.random() - 0.5) * 10,
                y: p.y + Math.sin(spreadAngle) * dist + (Math.random() - 0.5) * 10,
                size: isLighter ? 5 + Math.random() * 5 : 7 + Math.random() * 5,
                vx: Math.cos(spreadAngle) * 0.3 + (Math.random() - 0.5) * 0.5,
                vy: Math.sin(spreadAngle) * 0.3 + (Math.random() - 0.5) * 0.5,
                color: gasColor
              }, 1);
            }

            // Fire particles (lighter only)
            if (isLighter) {
              const fireCount = w.speedMult ? Math.floor(5 * w.speedMult) : 5;
              const flowMult = w.speedMult || 1;
              for (let i = 0; i < fireCount; i++) {
                const dist = 15 + Math.random() * 30 * flowMult;
                const spreadAngle = baseAngle + (Math.random() - 0.5) * 0.2;
                const flowSpeed = (1 + Math.random() * 1.5) * flowMult;
                const flowAngle = spreadAngle + (Math.random() - 0.5) * 0.3;
                this.spawnParticles({
                  type: 'fire' as ParticleType,
                  x: p.x + Math.cos(spreadAngle) * dist + (Math.random() - 0.5) * 8,
                  y: p.y + Math.sin(spreadAngle) * dist + (Math.random() - 0.5) * 8,
                  size: 2 + Math.random() * 2,
                  vx: Math.cos(flowAngle) * flowSpeed,
                  vy: Math.sin(flowAngle) * flowSpeed
                }, 1);
              }
            }

            // Damage pellets (pepper spray only)
            if (!isLighter) {
              for (let i = 0; i < pelletCount; i++) {
                const spread = (Math.random() - 0.5) * spreadAmount;
                const angle = baseAngle + spread;
                const speed = 6 + Math.random() * 2;
                const proj = new Projectile(
                  p.x,
                  p.y,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  1,
                  '#33ff33',
                  dmg,
                  12,
                  1,
                  isCrit
                );
                this.projectiles.push(proj);
              }
            }

            // Direct cone damage (lighter only)
            if (isLighter) {
              for (const e of this.enemies) {
                const dist = Utils.getDist(p.x, p.y, e.x, e.y);
                if (dist < coneLength) {
                  let edx = e.x - p.x;
                  let edy = e.y - p.y;
                  if (edx > CONFIG.worldSize / 2) edx -= CONFIG.worldSize;
                  if (edx < -CONFIG.worldSize / 2) edx += CONFIG.worldSize;
                  if (edy > CONFIG.worldSize / 2) edy -= CONFIG.worldSize;
                  if (edy < -CONFIG.worldSize / 2) edy += CONFIG.worldSize;
                  const enemyAngle = Math.atan2(edy, edx);
                  let angleDiff = Math.abs(enemyAngle - baseAngle);
                  if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                  if (angleDiff < spreadAmount / 2) {
                    this.hitEnemy(e, dmg * 2, isCrit);
                  }
                }
              }
            }
          }

          w.curCd = w.cd;
        }
      }
    });

    // Update projectiles
    this.projectiles.forEach(proj => proj.update());

    // Spawn bubble trail particles
    this.projectiles.forEach(proj => {
      if ((proj as any).isBubble && this.frames % 5 === 0) {
        this.spawnParticles({
          type: 'foam' as ParticleType,
          x: proj.x,
          y: proj.y,
          size: 2 + Math.random() * 2,
          vy: -0.5 - Math.random() * 0.5 // Float upward
        }, 1);
      }
    });

    // Update fireballs with particle emission
    this.fireballs.forEach(fb => {
      fb.update();

      // Emit trail particles
      if (fb.shouldEmitTrail()) {
        this.spawnParticles({ type: 'fire' as ParticleType, x: fb.x, y: fb.y, size: fb.getTrailParticleSize() }, fb.getTrailParticleCount());
      }
    });

    // Update enemies
    this.enemies.forEach(e => e.update(p, this.timeFreeze, this.obstacles));

    // Player-enemy collision
    this.enemies.forEach(e => {
      if (Utils.getDist(p.x, p.y, e.x, e.y) < p.radius + e.radius) {
        if (hasDamageImmunity(p.ultName, p.ultActiveTime)) return;

        if (this.frames % 30 === 0) {
          p.hp -= 5;
          this.spawnDamageText(p.x, p.y, '-5', '#f00');
          if (p.hp <= 0) this.gameOver(false);
        }
      }
    });

    // Projectile collisions
    this.projectiles.forEach(proj => {
      if (proj.isHostile) {
        // Hits player
        if (Utils.getDist(proj.x, proj.y, p.x, p.y) < proj.radius + p.radius) {
          if (hasDamageImmunity(p.ultName, p.ultActiveTime)) {
            proj.marked = true;
            return;
          }
          p.hp -= proj.dmg;
          this.spawnDamageText(p.x, p.y, `-${proj.dmg}`, '#f00');
          proj.marked = true;
          if (p.hp <= 0) this.gameOver(false);
        }
      } else {
        // Hits enemies
        for (const e of this.enemies) {
          if (!proj.hitList.includes(e) &&
              Utils.getDist(proj.x, proj.y, e.x, e.y) < proj.radius + e.radius) {
            this.hitEnemy(e, proj.dmg, proj.isCrit);
            proj.hitList.push(e);

            // Splash effect for bubbles
            if (proj.isBubble) {
              this.spawnParticles({ type: 'splash' as ParticleType, x: proj.x, y: proj.y }, 5);
              this.spawnParticles({ type: 'foam' as ParticleType, x: proj.x, y: proj.y, vy: -1 }, 3);

              // Bubble split on hit (level 4 upgrade)
              if (proj.splits && this.projectiles.length < 200) {
                const splits = calculateBubbleSplit(proj.x, proj.y, proj.dmg, proj.isCrit);
                for (const s of splits) {
                  const splitProj = new Projectile(
                    proj.x,
                    proj.y,
                    s.vx,
                    s.vy,
                    3,
                    '#aaddff',
                    s.dmg,
                    30,
                    1,
                    s.isCrit
                  );
                  splitProj.isBubble = true;
                  this.projectiles.push(splitProj);
                }
              }
            }

            // Explosion effect (frying pan level 2+)
            if (proj.explodeRadius) {
              const explosionResult = findEnemiesInExplosion(proj.x, proj.y, proj.explodeRadius, this.enemies, [e]);
              for (const other of explosionResult.enemies) {
                if (!proj.hitList.includes(other)) {
                  this.hitEnemy(other, proj.dmg * explosionResult.damageMultiplier, proj.isCrit);
                }
              }
              this.spawnParticles({ type: 'splash' as ParticleType, x: proj.x, y: proj.y }, 10);
            }

            // Knockback effect (frying pan level 3+)
            if (proj.knockback) {
              const kbAngle = Math.atan2(e.y - proj.y, e.x - proj.x);
              const newPos = applyKnockback(e, kbAngle, proj.knockback);
              e.x = newPos.x;
              e.y = newPos.y;
            }

            proj.pierce--;
            if (proj.pierce <= 0) {
              proj.marked = true;
              break;
            }
          }
        }
      }
    });

    // Fireball collisions
    this.fireballs.forEach(fb => {
      for (const e of this.enemies) {
        if (!fb.hitList.includes(e) &&
            Utils.getDist(fb.x, fb.y, e.x, e.y) < fb.radius + e.radius) {
          this.hitEnemy(e, fb.dmg, fb.isCrit);
          fb.hitList.push(e);

          // Explosion particles on hit
          this.spawnParticles({ type: 'fire' as ParticleType, x: fb.x, y: fb.y }, fb.getExplosionParticleCount());

          // Explosion radius (level 2+)
          if (fb.explodeRadius) {
            const explosionResult = findEnemiesInExplosion(fb.x, fb.y, fb.explodeRadius, this.enemies, [e]);
            for (const other of explosionResult.enemies) {
              if (!fb.hitList.includes(other)) {
                this.hitEnemy(other, fb.dmg * explosionResult.damageMultiplier, fb.isCrit);
              }
            }
          }

          fb.pierce--;
          if (fb.pierce <= 0) {
            fb.marked = true;
            break;
          }
        }
      }

      // Trail damage (level 4+) - damage enemies near the fireball
      if (fb.trailDamage && this.frames % 10 === 0) {
        const nearEnemies = findEnemiesNearPoint(fb.x, fb.y, 30, this.enemies, fb.hitList as Enemy[]);
        for (const e of nearEnemies) {
          this.hitEnemy(e, fb.trailDamage, false);
        }
      }

      // Fireball expires - spawn explosion
      if (fb.marked && fb.dur <= 0) {
        this.spawnParticles({ type: 'fire' as ParticleType, x: fb.x, y: fb.y }, fb.getExplosionParticleCount());

        // Explosion on expire (level 2+)
        if (fb.explodeRadius) {
          const explosionResult = findEnemiesInExplosion(fb.x, fb.y, fb.explodeRadius, this.enemies, fb.hitList as Enemy[]);
          for (const e of explosionResult.enemies) {
            this.hitEnemy(e, fb.dmg * explosionResult.damageMultiplier, fb.isCrit);
          }
        }
      }
    });

    // Loot collection
    this.loot.forEach(l => {
      if (isLootInRange(l.x, l.y, p.x, p.y, p.pickupRange)) {
        // Magnet loot toward player
        const newPos = calculateLootMagnetPosition(l.x, l.y, p.x, p.y, 0.15);
        l.x = newPos.x;
        l.y = newPos.y;

        // Check for collection
        if (canCollectLoot(l.x, l.y, p.x, p.y, 20)) {
          l.marked = true;

          const effect = calculateLootEffect(l.type, l.val, p.hp, p.maxHp);
          if (effect.message) {
            this.spawnDamageText(p.x, p.y, effect.message, effect.color || '#fff');
          }

          if (effect.type === 'xp') {
            p.gainXp(effect.xp || 0, () => this.triggerLevelUp());
          } else if (effect.type === 'chest') {
            this.openChest();
          } else if (effect.type === 'heart') {
            applyLootEffectToPlayer(p, effect);
          }
        }
      }
    });

    // Cleanup - in-place filtering to avoid GC pressure
    const filterMarked = <T extends { marked: boolean }>(arr: T[]): void => {
      let writeIdx = 0;
      for (let i = 0; i < arr.length; i++) {
        if (!arr[i].marked) {
          arr[writeIdx++] = arr[i];
        }
      }
      arr.length = writeIdx;
    };

    filterMarked(this.projectiles);
    filterMarked(this.fireballs);
    filterMarked(this.enemies);
    filterMarked(this.loot);

    // Update and cleanup particles
    this.particles.forEach(pt => pt.update());
    filterMarked(this.particles);

    // Filter damage texts by life
    let dmgWriteIdx = 0;
    for (let i = 0; i < this.damageTexts.length; i++) {
      if (this.damageTexts[i].life > 0) {
        this.damageTexts[dmgWriteIdx++] = this.damageTexts[i];
      } else {
        // Remove DOM element when life expires
        this.damageTexts[i].el.remove();
      }
    }
    this.damageTexts.length = dmgWriteIdx;

    // Update damage text positions
    UI.updateDamageTexts(this.damageTexts, p.x, p.y, this.frames);
    UI.updateUlt(p.ultCharge, p.ultMax);
    UI.updateItemSlots(p.items, p.inventory);

    // Update HUD
    if (shouldUpdateHud(this.frames)) {
      UI.updateHud(this.goldRun, this.time, p.level, this.kills, SaveData.data.selectedChar, this.particles.length, this.enemies.length);
    }

    // Update XP bar
    UI.updateXp(p.xp, p.nextXp, p.level);
  }

  hitEnemy(e: Enemy, dmg: number, isCrit: boolean): void {
    e.hp -= dmg;
    e.flash = 5;

    this.spawnDamageText(e.x, e.y, Math.floor(dmg), isCrit ? '#ff0' : '#fff', isCrit);

    if (e.hp <= 0 && !e.marked) {
      e.marked = true;
      this.kills++;
      this.goldRun += e.type === 'boss' ? 100 : (e.type === 'elite' ? 10 : 1);

      if (e.type === 'boss') this.bossKills++;

      UI.updateHud(this.goldRun, this.time, this.player?.level || 1, this.kills, SaveData.data.selectedChar, this.particles.length, this.enemies.length);

      // Death explosion effect
      const explosionSize = calculateDeathExplosionSize(e.type);
      this.spawnExplosion(e.x, e.y, explosionSize);

      // Blood particles
      this.spawnParticles({ type: 'blood', x: e.x, y: e.y }, 8 * explosionSize);

      // Drop loot
      const lootType = calculateLootDrop(e.type);
      this.loot.push(new Loot(e.x, e.y, lootType));
    }
  }

  openChest(): void {
    const gold = calculateChestGold();
    this.goldRun += gold;
    this.spawnDamageText(this.player?.x || 0, this.player?.y || 0, `+${gold}G`, '#fbbf24');
  }

  triggerLevelUp(): void {
    if (!this.player) return;

    this.paused = true;

    const pool = Object.keys(UPGRADES);
    const choices = selectUpgradeChoices(pool, 3);

    UI.showLevelUpScreen(choices, this.player.inventory, {
      items: this.player.items,
      critChance: this.player.critChance,
      dmgMult: this.player.dmgMult
    }, (id) => {
      if (this.player) {
        this.player.addUpgrade(id as any);
      }
      this.paused = false;
    });
  }

  render(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    // Render background (floor, grid) with Canvas 2D
    threeRenderer.renderBackgroundCanvas(ctx, this.player, cw, ch);

    if (!this.active || !this.player) return;

    const p = this.player;

    // Render ground illumination effects (fire glow, etc.)
    threeRenderer.renderIllumination(ctx, this.particles, this.fireballs, p.x, p.y, cw, ch);

    // Render main scene with Three.js - passing actual entity objects
    threeRenderer.render(
      p,
      this.enemies,
      this.projectiles,
      this.loot,
      this.fireballs,
      this.particles,
      cw,
      ch
    );

    // Render obstacles using Canvas 2D overlay
    threeRenderer.renderObstaclesCanvas(ctx, this.obstacles, p.x, p.y, cw, ch);

    // Draw joysticks (mobile only)
    // Movement joystick (left)
    if (this.input.joy.active) {
      const joy = calculateJoystickParams(this.input.joy.ox, this.input.joy.oy, this.input.joy.x, this.input.joy.y);
      ctx.save();
      ctx.strokeStyle = JOYSTICK_COLORS.movement.base;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(joy.centerX, joy.centerY, joy.baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = JOYSTICK_COLORS.movement.knob;
      ctx.beginPath();
      ctx.arc(joy.knobX, joy.knobY, joy.knobRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Aim joystick (right)
    if (this.input.aimJoy.active) {
      const aimJoy = calculateJoystickParams(this.input.aimJoy.ox, this.input.aimJoy.oy, this.input.aimJoy.x, this.input.aimJoy.y);
      ctx.save();
      ctx.strokeStyle = JOYSTICK_COLORS.aim.base;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(aimJoy.centerX, aimJoy.centerY, aimJoy.baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = JOYSTICK_COLORS.aim.knob;
      ctx.beginPath();
      ctx.arc(aimJoy.knobX, aimJoy.knobY, aimJoy.knobRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Player health bar
    const hpPct = p.hp / p.maxHp;
    ctx.fillStyle = 'red';
    ctx.fillRect(cw / 2 - 15, ch / 2 + 18, 30, 4);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(cw / 2 - 15, ch / 2 + 18, 30 * hpPct, 4);
  }

  loop(currentTime = 0): void {
    if (!this.lastTime) this.lastTime = currentTime;
    if (!this.fpsLastTime) this.fpsLastTime = currentTime;
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // FPS tracking
    this.fpsFrames++;
    if (currentTime - this.fpsLastTime >= 1000) {
      this.fps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsLastTime = currentTime;

      // Log debug info every second
      if (this.active) {
        console.log(`FPS: ${this.fps} | Particles: ${this.particles.length} | Enemies: ${this.enemies.length} | Projectiles: ${this.projectiles.length} | Fireballs: ${this.fireballs.length}`);
      }
    }

    this.accumulator += deltaTime;

    // Cap accumulator to prevent spiral death on alt-tab (max 100ms catchup)
    if (this.accumulator > 100) {
      this.accumulator = 100;
    }

    // Fixed timestep update - run update() exactly 60 times per second
    while (this.accumulator >= this.timestep) {
      this.update();
      this.accumulator -= this.timestep;
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}

export const Game = new GameCore();
export { GameCore };
