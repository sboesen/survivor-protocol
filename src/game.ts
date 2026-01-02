import { CONFIG } from './config';
import { Utils } from './utils';
import { CHARACTERS } from './data/characters';
import { UPGRADES } from './data/upgrades';
import { SaveData } from './systems/saveData';
import { UI } from './systems/ui';
import { Menu } from './systems/menu';
import { GachaAnim } from './systems/gacha';
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

    // Warm up JIT by running fireball code once
    this.warmupFireball();
  }

  private warmupFireball(): void {
    // Pre-compile fireball code to prevent first-shot lag
    const fb = new FireballProjectile(0, 0, 100, 100, 5, 10, 60, 1, false);
    for (let i = 0; i < 5; i++) fb.update();
    fb.shouldEmitTrail();
    fb.getTrailParticleCount();
    fb.getExplosionParticleCount();
  }

  quitRun(): void {
    this.gameOver(true);
  }

  gameOver(success = false): void {
    this.active = false;

    const survivalBonus = Math.floor(this.goldRun * (this.mins * 0.2));
    const killBonus = Math.floor(this.kills / 100) * 50;
    const bossBonus = this.bossKills * 200;
    const total = this.goldRun + survivalBonus + killBonus + bossBonus;

    SaveData.data.gold += total;
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
    const count = Math.floor(15 * size);
    this.spawnParticles({ type: 'explosion' as ParticleType, x, y }, count);
    this.spawnParticles({ type: 'smoke', x, y }, Math.floor(count / 3));
  }

  update(): void {
    if (!this.active || this.paused || !this.player) return;

    const p = this.player; // Non-null assertion after check

    this.frames++;

    // Time tracking
    if (this.frames % 60 === 0) {
      this.time++;
      this.mins = Math.floor(this.time / 60);
      if (p.ultCharge < p.ultMax) {
        p.ultCharge += 5;
      }
    }

    // Ultimate cooldown
    if (this.timeFreeze > 0) this.timeFreeze--;
    if (p.ultActiveTime > 0) p.ultActiveTime--;

    // Aura animation frame tracking
    p.auraAttackFrame++;

    // Healing fountains (work even when standing still)
    for (const o of this.obstacles) {
      if (o.type === 'font') {
        const dist = Utils.getDist(p.x, p.y, o.x, o.y);
        if (dist < 40 && this.frames % 30 === 0 && p.hp < p.maxHp) {
          p.hp++;
          this.spawnDamageText(p.x, p.y, '+', '#0f0');
        }
      }
    }

    // Player movement
    let dx = 0, dy = 0;
    if (this.input.keys['w']) dy = -1;
    if (this.input.keys['s']) dy = 1;
    if (this.input.keys['a']) dx = -1;
    if (this.input.keys['d']) dx = 1;
    if (this.input.joy.active) {
      dx = this.input.joy.x;
      dy = this.input.joy.y;
    }

    if (dx !== 0 || dy !== 0) {
      this.input.lastDx = dx;
      this.input.lastDy = dy;

      const len = Math.hypot(dx, dy);
      const spd = p.speed * (
        p.ultName === 'Ollie' && p.ultActiveTime > 0 ? 1.5 : 1
      );

      if (len > 1) {
        dx /= len;
        dy /= len;
      }

      let nx = (p.x + dx * spd + CONFIG.worldSize) % CONFIG.worldSize;
      let ny = (p.y + dy * spd + CONFIG.worldSize) % CONFIG.worldSize;

      // Collision with obstacles
      let blocked = false;
      for (const o of this.obstacles) {
        const dist = Utils.getDist(nx, ny, o.x, o.y);

        if (o.type === 'font') {
          // Healing handled above
          continue;
        }

        if (dist < 80) {
          if (nx > CONFIG.worldSize - 50 || nx < 50 || ny > CONFIG.worldSize - 50 || ny < 50) continue;
          if (nx > o.x - o.w / 2 - 8 && nx < o.x + o.w / 2 + 8 &&
              ny > o.y - o.h / 2 - 8 && ny < o.y + o.h / 2 + 8) {
            blocked = true;
          }
        }
      }

      if (!blocked) {
        p.x = nx;
        p.y = ny;
      }
    }

    // Enemy spawning
    if (this.timeFreeze <= 0 && this.frames % Math.max(10, 60 - this.mins * 5) === 0) {
      let type: EntityType = 'basic';

      if (this.time > 0 && this.time % 300 === 0) {
        type = 'boss';
      } else if (this.time > 0 && this.time % 60 === 0) {
        type = 'elite';
      } else if (Math.random() > 0.9) {
        type = 'bat';
      }

      if (type === 'boss') {
        if (!this.enemies.find(e => e.type === 'boss')) {
          this.enemies.push(new Enemy(p.x, p.y, 'boss', this.mins, this.obstacles));
        }
      } else {
        this.enemies.push(new Enemy(p.x, p.y, type, this.mins, this.obstacles));
      }
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

      if (w.type === 'aura' && w.area) {
        if (this.frames % 20 === 0) {
          p.auraAttackFrame = 0; // Reset for attack animation
          this.enemies.forEach(e => {
            if (Utils.getDist(p.x, p.y, e.x, e.y) < w.area!) {
              this.hitEnemy(e, dmg, isCrit);
            }
          });
        }
        return;
      }

      if (w.curCd <= 0) {
        let fired = false;

        if (w.type === 'nearest') {
          let near: Enemy | null = null;
          let min = 400;

          for (const e of this.enemies) {
            const d = Utils.getDist(p.x, p.y, e.x, e.y);
            if (d < min) {
              min = d;
              near = e;
            }
          }

          if (near) {
            let edx = near.x - p.x;
            let edy = near.y - p.y;

            if (edx > CONFIG.worldSize / 2) edx -= CONFIG.worldSize;
            if (edx < -CONFIG.worldSize / 2) edx += CONFIG.worldSize;
            if (edy > CONFIG.worldSize / 2) edy -= CONFIG.worldSize;
            if (edy < -CONFIG.worldSize / 2) edy += CONFIG.worldSize;

            const ang = Math.atan2(edy, edx);
            this.projectiles.push(new Projectile(
              p.x,
              p.y,
              Math.cos(ang) * 8,
              Math.sin(ang) * 8,
              5,
              '#0ff',
              dmg,
              60,
              1 + p.items.pierce,
              isCrit
            ));
            fired = true;
          }
        } else if (w.type === 'bubble') {
          // Bubble stream: wavy projectiles to nearest enemy with floating trail
          let near: Enemy | null = null;
          let min = 400;

          for (const e of this.enemies) {
            const d = Utils.getDist(p.x, p.y, e.x, e.y);
            if (d < min) {
              min = d;
              near = e;
            }
          }

          if (near) {
            let edx = near.x - p.x;
            let edy = near.y - p.y;

            if (edx > CONFIG.worldSize / 2) edx -= CONFIG.worldSize;
            if (edx < -CONFIG.worldSize / 2) edx += CONFIG.worldSize;
            if (edy > CONFIG.worldSize / 2) edy -= CONFIG.worldSize;
            if (edy < -CONFIG.worldSize / 2) edy += CONFIG.worldSize;

            const ang = Math.atan2(edy, edx);
            const speed = 3.5 * (w.speedMult || 1);
            const count = (w.projectileCount || 1) + p.items.projectile;

            for (let i = 0; i < count; i++) {
              const spread = (i - (count - 1) / 2) * 0.15;
              const proj = new Projectile(
                p.x,
                p.y,
                Math.cos(ang + spread) * speed,
                Math.sin(ang + spread) * speed,
                5,
                '#aaddff',
                dmg,
                70,
                1 + p.items.pierce,
                isCrit
              );
              proj.isBubble = true;
              if (w.splits) proj.splits = true;
              this.projectiles.push(proj);
            }
            fired = true;
          }
        } else if (w.type === 'facing') {
          // Use aimAngle from mouse/aim joystick, fallback to movement direction
          const aimAngle = this.input.aimAngle ?? Math.atan2(this.input.lastDy || 0, this.input.lastDx || 1);
          const speed = 10 * (w.speedMult || 1);
          const count = (w.projectileCount || 1) + p.items.projectile;

          for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 0.2;
            const angle = aimAngle + spread;
            this.projectiles.push(new Projectile(
              p.x,
              p.y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              4,
              '#f00',
              dmg,
              40,
              2 + p.items.pierce,
              isCrit
            ));
          }
          fired = true;
        } else if (w.type === 'arc') {
          const count = (w.projectileCount || 1) + p.items.projectile;
          const size = w.size || 10;

          for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 4;
            const proj = new Projectile(
              p.x,
              p.y,
              vx,
              -10,
              size,
              '#aaa',
              dmg * 2,
              60,
              3 + p.items.pierce,
              isCrit
            );
            proj.isArc = true;
            if (w.explodeRadius) proj.explodeRadius = w.explodeRadius;
            if (w.knockback) proj.knockback = w.knockback;
            this.projectiles.push(proj);
          }
          fired = true;
        } else if (w.type === 'fireball') {
          // Fireball: homing projectile to nearest enemy with particle trail
          let near: Enemy | null = null;
          let min = 400;

          for (const e of this.enemies) {
            const d = Utils.getDist(p.x, p.y, e.x, e.y);
            if (d < min) {
              min = d;
              near = e;
            }
          }

          if (near) {
            const speed = 6 * (w.speedMult || 1);
            const duration = 90 * (w.speedMult || 1);
            const count = (w.projectileCount || 1) + p.items.projectile;

            // Calculate base angle to target
            let edx = near.x - p.x;
            let edy = near.y - p.y;
            if (edx > CONFIG.worldSize / 2) edx -= CONFIG.worldSize;
            if (edx < -CONFIG.worldSize / 2) edx += CONFIG.worldSize;
            if (edy > CONFIG.worldSize / 2) edy -= CONFIG.worldSize;
            if (edy < -CONFIG.worldSize / 2) edy += CONFIG.worldSize;
            const baseAngle = Math.atan2(edy, edx);

            for (let i = 0; i < count; i++) {
              // Spread fireballs in a fan pattern - reduced spread, keep one straight for even counts
              let spreadAngle = 0;
              if (count > 1) {
                const spread = 0.08; // Much smaller spread
                if (count % 2 === 0) {
                  // Even count: keep middle two going straight, spread others
                  const half = count / 2;
                  if (i < half - 1) {
                    spreadAngle = -(half - 1 - i) * spread;
                  } else if (i >= half) {
                    spreadAngle = (i - half + 1) * spread;
                  }
                  // i === half - 1 and i === half both go straight (spreadAngle = 0)
                } else {
                  // Odd count: center one goes straight
                  spreadAngle = (i - (count - 1) / 2) * spread;
                }
              }
              const targetAngle = baseAngle + spreadAngle;
              const targetX = p.x + Math.cos(targetAngle) * 400;
              const targetY = p.y + Math.sin(targetAngle) * 400;

              // Offset starting position so fireballs don't overlap at spawn
              const perpAngle = baseAngle + Math.PI / 2;
              const startOffset = 15 * Math.sin(spreadAngle); // Spread starts perpendicular to aim
              const startX = p.x + Math.cos(perpAngle) * startOffset;
              const startY = p.y + Math.sin(perpAngle) * startOffset;

              const fireball = new FireballProjectile(
                startX,
                startY,
                targetX,
                targetY,
                speed,
                dmg,
                duration,
                1 + p.items.pierce,
                isCrit
              );
              if (w.explodeRadius) fireball.explodeRadius = w.explodeRadius;
              if (w.trailDamage) fireball.trailDamage = w.trailDamage;
              this.fireballs.push(fireball);
            }
            fired = true;
          }
        } else if (w.type === 'spray') {
          // Spray weapons (lighter: white cloud + fire sparks, pepper_spray: green toxic cloud)
          // Use aimAngle from mouse/aim joystick, fallback to movement direction
          const baseAngle = this.input.aimAngle ?? (
            this.input.lastDx !== undefined ?
              Math.atan2(this.input.lastDy || 0, this.input.lastDx) :
              Math.random() * Math.PI * 2
          );

          const isLighter = w.id === 'lighter';
          const gasColor = isLighter ? '#ffcccc' : '#33ff33';
          // Use weapon properties for upgrades
          const pelletCount = isLighter ? 3 : (w.pelletCount || 5);
          const spreadAmount = w.spread || (isLighter ? 0.25 : 0.4);
          const coneLength = w.coneLength || 60;

          // Spawn gas cloud particles along the stream
          for (let i = 0; i < (isLighter ? 10 : 6); i++) {
            const dist = 10 + Math.random() * (isLighter ? 50 : 80);
            // Lighter: tighter spread that increases with distance
            let gasSpread = isLighter ? spreadAmount * 0.3 : spreadAmount;
            if (isLighter) {
              // Even narrower close to player, widens slightly at distance
              const distFactor = (dist - 10) / 50; // 0 to 1
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

          // Fire particles along the stream (lighter only) - flow outward from player
          if (isLighter) {
            const fireCount = w.speedMult ? Math.floor(5 * w.speedMult) : 5;
            const flowMult = w.speedMult || 1;
            for (let i = 0; i < fireCount; i++) {
              const dist = 15 + Math.random() * 30 * flowMult;
              const spreadAngle = baseAngle + (Math.random() - 0.5) * 0.2;
              // Velocity flows outward with small variance
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

          // Tiny damage pellets - pepper spray only
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
                1, // Tiny radius
                '#33ff33',
                dmg,
                12,
                1,
                isCrit
              );
              this.projectiles.push(proj);
            }
          }

          // Lighter direct cone damage (no visible pellets)
          if (isLighter) {
            for (const e of this.enemies) {
              const dist = Utils.getDist(p.x, p.y, e.x, e.y);
              if (dist < coneLength) {
                // Check if enemy is within the cone angle
                let edx = e.x - p.x;
                let edy = e.y - p.y;

                // Handle world wrap
                if (edx > CONFIG.worldSize / 2) edx -= CONFIG.worldSize;
                if (edx < -CONFIG.worldSize / 2) edx += CONFIG.worldSize;
                if (edy > CONFIG.worldSize / 2) edy -= CONFIG.worldSize;
                if (edy < -CONFIG.worldSize / 2) edy += CONFIG.worldSize;

                const enemyAngle = Math.atan2(edy, edx);
                let angleDiff = Math.abs(enemyAngle - baseAngle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                // If within cone, deal damage
                if (angleDiff < spreadAmount / 2) {
                  this.hitEnemy(e, dmg * 2, isCrit); // Multiplied since it hits every 3 frames
                }
              }
            }
          }

          fired = true;
        }

        if (fired) w.curCd = w.cd;
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
    this.enemies.forEach(e => e.update(p, this.timeFreeze, this.obstacles, this.frames));

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
      const d = Utils.getDist(p.x, p.y, l.x, l.y);

      if (d < p.pickupRange) {
        let ldx = p.x - l.x;
        let ldy = p.y - l.y;

        if (ldx > CONFIG.worldSize / 2) ldx -= CONFIG.worldSize;
        if (ldx < -CONFIG.worldSize / 2) ldx += CONFIG.worldSize;
        if (ldy > CONFIG.worldSize / 2) ldy -= CONFIG.worldSize;
        if (ldy < -CONFIG.worldSize / 2) ldy += CONFIG.worldSize;

        l.x = (l.x + ldx * 0.15 + CONFIG.worldSize) % CONFIG.worldSize;
        l.y = (l.y + ldy * 0.15 + CONFIG.worldSize) % CONFIG.worldSize;

        if (d < 20) {
          l.marked = true;

          if (l.type === 'gem') {
            p.gainXp(l.val, () => this.triggerLevelUp());
            this.spawnDamageText(p.x, p.y, '+XP', '#0f0');
          }
          if (l.type === 'chest') this.openChest();
          if (l.type === 'heart') {
            p.hp = Math.min(p.maxHp, p.hp + 30);
            this.spawnDamageText(p.x, p.y, '+HP', '#0f0');
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
    if (this.frames % 30 === 0) {
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
      const explosionSize = e.type === 'boss' ? 5 : (e.type === 'elite' ? 2 : 1);
      this.spawnExplosion(e.x, e.y, explosionSize);

      // Blood particles
      this.spawnParticles({ type: 'blood', x: e.x, y: e.y }, 8 * explosionSize);

      // Drop loot
      if (e.type === 'boss' || e.type === 'elite') {
        this.loot.push(new Loot(e.x, e.y, 'chest'));
      } else if (Math.random() < 0.05) {
        this.loot.push(new Loot(e.x, e.y, 'heart'));
      } else {
        this.loot.push(new Loot(e.x, e.y, 'gem'));
      }
    }
  }

  openChest(): void {
    const gold = 10 + Math.floor(Math.random() * 20);
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

    // Draw grid
    ctx.save();
    if (zoomScale < 1) {
      // Center the zoom
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cw / 2, -ch / 2);
    }
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 100;
    const offsetX = px % gridSize;
    const offsetY = py % gridSize;

    ctx.beginPath();
    for (let x = -offsetX; x < cw; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
    }
    for (let y = -offsetY; y < ch; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
    }
    ctx.stroke();

    // Draw fire particle illuminations (before entities so lights appear on ground)
    this.particles.forEach(pt => pt.drawIllumination(ctx, px, py, cw, ch));
    this.fireballs.forEach(fb => fb.drawIllumination(ctx, px, py, cw, ch));

    // Draw entities
    this.obstacles.forEach(o => o.draw(ctx, px, py, cw, ch));
    this.loot.forEach(l => l.draw(ctx, px, py, cw, ch));
    this.particles.forEach(pt => pt.draw(ctx, px, py, cw, ch));
    this.enemies.forEach(e => e.draw(ctx, px, py, cw, ch));
    this.projectiles.forEach(proj => proj.draw(ctx, px, py, cw, ch));
    this.fireballs.forEach(fb => fb.draw(ctx, px, py, cw, ch));
    p.draw(ctx, px, py, cw, ch);
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
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.accumulator += deltaTime;

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
