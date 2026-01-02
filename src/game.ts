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
import {
  findNearestEnemy,
  calculateWrappedAngle,
} from './systems/targeting';
import { fireWeapon } from './systems/weapons';
import {
  calculateLootDrop,
  calculateChestGold,
  calculateExplosionParticles,
  calculateDeathExplosionSize,
} from './systems/combat';
import { Player } from './entities/player';
import { Enemy } from './entities/enemy';
import { Projectile } from './entities/projectile';
import { FireballProjectile } from './entities/fireballProjectile';
import { Loot } from './entities/loot';
import { Obstacle } from './entities/obstacle';
import { Particle, type ParticleSpawnConfig, type ParticleType } from './entities/particle';
import type { InputState, DamageText, EntityType } from './types';

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

  init(): void {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

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

      switch (type) {
        case 'Security':
          this.player.ultActiveTime = 300;
          this.spawnDamageText(this.player.x, this.player.y, 'SECURITY!', '#4af');
          break;
        case 'Ollie':
          this.player.ultActiveTime = 300;
          this.spawnDamageText(this.player.x, this.player.y, 'OLLIE!', '#0f0');
          break;
        case 'ClosingTime':
          this.timeFreeze = 240;
          this.spawnDamageText(this.player.x, this.player.y, 'CLOSED!', '#888');
          break;
        case 'GreaseFire':
          for (let i = 0; i < 12; i++) {
            const ang = (Math.PI * 2 / 12) * i;
            const proj = new Projectile(
              this.player.x,
              this.player.y,
              Math.cos(ang) * 5,
              Math.sin(ang) * 5,
              20,
              '#f80',
              100,
              100,
              999,
              true
            );
            proj.isArc = true;
            this.projectiles.push(proj);
          }
          this.spawnDamageText(this.player.x, this.player.y, 'GREASE FIRE!', '#f80');
          break;
        case 'Reboot':
          // Heal 50% HP + 5s immunity
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.5);
          this.player.ultActiveTime = 300;
          this.spawnDamageText(this.player.x, this.player.y, 'REBOOT!', '#0ff');
          break;
      }
    }
  }

  spawnDamageText(wx: number, wy: number, txt: string | number, color = '#fff', isCrit = false): void {
    const el = UI.spawnDamageText(wx, wy, txt, color, isCrit);
    this.damageTexts.push({ el, wx, wy, life: 50 });
  }

  spawnParticles(config: ParticleSpawnConfig, count = 1): void {
    // Cap particles to prevent performance issues
    const MAX_PARTICLES = 2500;
    if (this.particles.length >= MAX_PARTICLES) return;

    // Ensure particle type is valid
    const validTypes: ParticleType[] = ['water', 'explosion', 'smoke', 'blood', 'spark', 'foam', 'ripple', 'caustic', 'splash', 'fire', 'gas'];
    if (!validTypes.includes(config.type)) return;

    // Adjust count if we're near the cap
    const available = MAX_PARTICLES - this.particles.length;
    const actualCount = Math.min(count, available);

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
        w.curCd -= (1 + p.items.cooldown) * (
          p.ultName === 'Ollie' && p.ultActiveTime > 0 ? 2 : 1
        );
      }

      let dmg = w.baseDmg * p.dmgMult;
      const isCrit = Math.random() < p.critChance;
      if (isCrit) dmg *= 3;

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
        if ((p.ultName === 'Security' || p.ultName === 'Reboot') && p.ultActiveTime > 0) return;

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
          if ((p.ultName === 'Security' || p.ultName === 'Reboot') && p.ultActiveTime > 0) {
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
                for (let i = 0; i < 3; i++) {
                  const angle = (Math.PI * 2 / 3) * i;
                  const splitProj = new Projectile(
                    proj.x,
                    proj.y,
                    Math.cos(angle) * 3,
                    Math.sin(angle) * 3,
                    3,
                    '#aaddff',
                    proj.dmg * 0.5,
                    30,
                    1,
                    proj.isCrit
                  );
                  splitProj.isBubble = true;
                  this.projectiles.push(splitProj);
                }
              }
            }

            // Explosion effect (frying pan level 2+)
            if (proj.explodeRadius) {
              for (const other of this.enemies) {
                if (other !== e && !proj.hitList.includes(other)) {
                  const dist = Utils.getDist(proj.x, proj.y, other.x, other.y);
                  if (dist < proj.explodeRadius) {
                    this.hitEnemy(other, proj.dmg * 0.5, proj.isCrit);
                  }
                }
              }
              this.spawnParticles({ type: 'splash' as ParticleType, x: proj.x, y: proj.y }, 10);
            }

            // Knockback effect (frying pan level 3+)
            if (proj.knockback) {
              const kbAngle = Math.atan2(e.y - proj.y, e.x - proj.x);
              const kbForce = proj.knockback;
              e.x = (e.x + Math.cos(kbAngle) * kbForce + CONFIG.worldSize) % CONFIG.worldSize;
              e.y = (e.y + Math.sin(kbAngle) * kbForce + CONFIG.worldSize) % CONFIG.worldSize;
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
            for (const other of this.enemies) {
              if (other !== e && !fb.hitList.includes(other)) {
                const dist = Utils.getDist(fb.x, fb.y, other.x, other.y);
                if (dist < fb.explodeRadius) {
                  this.hitEnemy(other, fb.dmg * 0.5, fb.isCrit);
                }
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
        for (const e of this.enemies) {
          if (!fb.hitList.includes(e)) {
            const dist = Utils.getDist(fb.x, fb.y, e.x, e.y);
            if (dist < 30) {
              this.hitEnemy(e, fb.trailDamage, false);
            }
          }
        }
      }

      // Fireball expires - spawn explosion
      if (fb.marked && fb.dur <= 0) {
        this.spawnParticles({ type: 'fire' as ParticleType, x: fb.x, y: fb.y }, fb.getExplosionParticleCount());

        // Explosion on expire (level 2+)
        if (fb.explodeRadius) {
          for (const e of this.enemies) {
            if (!fb.hitList.includes(e)) {
              const dist = Utils.getDist(fb.x, fb.y, e.x, e.y);
              if (dist < fb.explodeRadius) {
                this.hitEnemy(e, fb.dmg * 0.5, fb.isCrit);
              }
            }
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
    const choices: string[] = [];

    while (choices.length < 3) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      if (!choices.includes(c)) choices.push(c);
    }

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

    const ctx = this.ctx; // Non-null assertion after check
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (!this.active || !this.player) return;

    const p = this.player;
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const px = p.x;
    const py = p.y;

    // Zoom out on mobile for better visibility
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const zoomScale = isMobile ? 0.7 : 1;

    // Draw grid/floor - simple performant grid with dark floor
    ctx.save();
    if (zoomScale < 1) {
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cw / 2, -ch / 2);
    }

    // Dark floor background
    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(0, 0, cw, ch);

    // Simple grid lines (much cheaper than tiles)
    const tileSize = 100;
    const offsetX = px % tileSize;
    const offsetY = py % tileSize;

    ctx.strokeStyle = '#252b3d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -offsetX; x <= cw; x += tileSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
    }
    for (let y = -offsetY; y <= ch; y += tileSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
    }
    ctx.stroke();

    // Draw entities
    this.obstacles.forEach(o => o.draw(ctx, px, py, cw, ch));
    this.loot.forEach(l => l.draw(ctx, px, py, cw, ch));
    this.particles.forEach(pt => pt.draw(ctx, px, py, cw, ch));
    this.enemies.forEach(e => e.draw(ctx, px, py, cw, ch));
    this.projectiles.forEach(proj => proj.draw(ctx, px, py, cw, ch));
    this.fireballs.forEach(fb => fb.draw(ctx, px, py, cw, ch));
    p.draw(ctx, px, py, cw, ch);

    // Draw illuminations AFTER entities so the light effect appears on top using 'lighter' composite
    this.particles.forEach(pt => pt.drawIllumination(ctx, px, py, cw, ch));
    this.fireballs.forEach(fb => fb.drawIllumination(ctx, px, py, cw, ch));
    ctx.restore();

    // Draw joysticks (mobile only)
    const joyOffsetY = 10;
    const joyRadius = 50;
    const knobRadius = 20;

    // Movement joystick (left)
    if (this.input.joy.active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.input.joy.ox, this.input.joy.oy + joyOffsetY, joyRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      const joyKnobX = this.input.joy.ox + this.input.joy.x * joyRadius;
      const joyKnobY = this.input.joy.oy + joyOffsetY + this.input.joy.y * joyRadius;
      ctx.arc(joyKnobX, joyKnobY, knobRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Aim joystick (right)
    if (this.input.aimJoy.active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.input.aimJoy.ox, this.input.aimJoy.oy + joyOffsetY, joyRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 200, 100, 0.5)';
      ctx.beginPath();
      const aimKnobX = this.input.aimJoy.ox + this.input.aimJoy.x * joyRadius;
      const aimKnobY = this.input.aimJoy.oy + joyOffsetY + this.input.aimJoy.y * joyRadius;
      ctx.arc(aimKnobX, aimKnobY, knobRadius, 0, Math.PI * 2);
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
