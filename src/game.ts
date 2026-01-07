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
  calculateInfernoProjectiles,
  getTimeFreezeDuration,
} from './systems/ultimates';
import { selectUpgradeChoices } from './systems/levelUp';
import {
  isValidParticleType,
  calculateParticleSpawnCount,
  canSpawnParticles,
} from './systems/particleSpawning';
import { threeRenderer } from './renderer/three';
import { Player } from './entities/player';
import { Enemy } from './entities/enemy';
import { Projectile } from './entities/projectile';
import { FireballProjectile } from './entities/fireballProjectile';
import { Loot } from './entities/loot';
import { Obstacle } from './entities/obstacle';
import { Particle, type ParticleSpawnConfig, type ParticleType } from './entities/particle';
import type { InputState, DamageText } from './types';
import { ItemGenerator } from './items/generator';
import type { Item } from './items/types';
import { rollItemType, shouldDropItem } from './items/drops';
import { Stash } from './items/stash';
import { ItemStats } from './items/stats';
import {
  applyAreaBonus,
  applyArmorReduction,
  applyDurationBonus,
  applyGoldBonus,
  applyHealingBonus,
  applyXpBonus,
} from './systems/statEffects';

class GameCore {
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;

  // Debug stats
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
  collectedLoot: Item[] = [];
  securedLootId: string | null = null;
  lootInventoryOpen = false;
  debugLootBoost = false;

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
    // Initialize Three.js renderer (async for image loading)
    await threeRenderer.init();

    this.resize();
    window.onresize = () => this.resize();

    SaveData.load();
    GachaAnim.init();

    // Keyboard input
    window.onkeydown = (e) => {
      this.input.keys[e.key] = true;
      if (e.key.toLowerCase() === 'z') this.triggerUlt();
      if (e.key.toLowerCase() === 'i') this.toggleLootInventory();
    };
    window.onkeyup = (e) => {
      this.input.keys[e.key] = false;
    };

    // Mouse aim tracking - updates aim angle based on cursor position relative to player
    window.onmousemove = (e) => {
      if (!this.player) return;
      // Calculate angle from center of screen (player position) to mouse
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.input.aimAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      // Deactivate aim joystick when using mouse
      this.input.aimJoy.active = false;
    };

    // Touch/joystick input - split into two zones
    const getCanvasPos = (clientX: number, clientY: number) => {
      return {
        x: clientX,
        y: clientY,
      };
    };
    window.ontouchstart = (e) => {
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
    window.ontouchmove = (e) => {
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
    window.ontouchend = (e) => {
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
    threeRenderer.resize(window.innerWidth, window.innerHeight);
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

    const loadoutStats = ItemStats.calculate(SaveData.data.loadout);

    this.player = new Player(
      char.id,
      char.hpMod,
      char.spdMod,
      char.weapon,
      char.ult,
      SaveData.data.shop,
      loadoutStats
    );

    this.enemies = [];
    this.projectiles = [];
    this.fireballs = [];
    this.loot = [];
    this.collectedLoot = [];
    this.securedLootId = null;
    this.lootInventoryOpen = false;
    UI.updateVeiledCount(0);
    UI.hideLootInventory();
    UI.hideExtractionScreen();
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
    const dummyPlayer = new Player('paladin', 1, 1, 'bubble_stream', 'DivineShield', { health: 0, speed: 0, magnet: 0, damage: 0 });
    const enemy = new Enemy(1000, 1000, 'basic', 0);
    enemy.update(dummyPlayer, 0, []);

    // Skip loot draw warmup - no longer using Canvas 2D
  }

  quitRun(): void {
    this.gameOver(true);
  }

  toggleLootInventory(): void {
    if (!this.active || !this.player) return;
    if (this.paused && !this.lootInventoryOpen) return;

    this.lootInventoryOpen = !this.lootInventoryOpen;
    this.paused = this.lootInventoryOpen;

    if (this.lootInventoryOpen) {
      UI.showLootInventory(this.collectedLoot, this.securedLootId, (itemId) => this.secureLoot(itemId));
    } else {
      UI.hideLootInventory();
    }
  }

  setDebugLootBoost(enabled: boolean): void {
    this.debugLootBoost = enabled;
  }

  secureLoot(itemId: string): void {
    this.securedLootId = itemId;
    if (this.lootInventoryOpen) {
      UI.showLootInventory(this.collectedLoot, this.securedLootId, (nextId) => this.secureLoot(nextId));
    }
  }

  gameOver(success = false): void {
    this.active = false;
    this.lootInventoryOpen = false;
    UI.hideLootInventory();

    const rewards = calculateGameOverRewards({
      goldRun: this.goldRun,
      mins: this.mins,
      kills: this.kills,
      bossKills: this.bossKills,
    });

    const stash = Stash.fromJSON(SaveData.data.stash);
    const securedItem = this.collectedLoot.find(item => item.id === this.securedLootId) ?? null;
    const itemsToStore = success
      ? this.collectedLoot
      : (securedItem ? [securedItem] : []);
    itemsToStore.forEach(item => {
      stash.addItem(item);
    });
    SaveData.data.stash = stash.toJSON();

    SaveData.data.gold += rewards.total;
    SaveData.save();

    if (success) {
      UI.showExtractionScreen(itemsToStore, () => this.returnToMenu());
    } else {
      UI.showGameOverScreen(success, this.goldRun, this.mins, this.kills, this.bossKills);
    }
  }

  returnToMenu(): void {
    const gameOverScreen = document.getElementById('gameover-screen');
    const menuScreen = document.getElementById('menu-screen');

    if (gameOverScreen) gameOverScreen.classList.remove('active');
    UI.hideExtractionScreen();
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
        case 'IronWill':
        case 'ShadowStep':
        case 'Reboot':
          this.player.ultActiveTime = config.duration;
          break;
        case 'DivineShield':
          this.timeFreeze = getTimeFreezeDuration();
          break;
        case 'Inferno':
          const projectiles = calculateInfernoProjectiles(this.player.x, this.player.y);
          for (const projData of projectiles) {
            const duration = applyDurationBonus(projData.duration, this.player.durationBonus);
            const proj = new Projectile(
              this.player.x,
              this.player.y,
              projData.vx,
              projData.vy,
              projData.damage,
              projData.color,
              duration,
              100,
              projData.pierce,
              true
            );
            proj.isArc = true;
            this.projectiles.push(proj);
          }
          break;
        case 'Volley':
          const arrowProjectiles = calculateInfernoProjectiles(this.player.x, this.player.y);
          for (const projData of arrowProjectiles) {
            const duration = applyDurationBonus(projData.duration, this.player.durationBonus);
            const proj = new Projectile(
              this.player.x,
              this.player.y,
              projData.vx,
              projData.vy,
              5,
              '#4a4',
              projData.damage,
              duration,
              projData.pierce,
              false,
              false,
              'bow'
            );
            (proj as any).spriteId = 'weapons/arrow';
            this.projectiles.push(proj);
          }
          break;
      }

      // Reboot also heals
      if (type === 'Reboot') {
        const baseHeal = calculateRebootHeal(this.player.hp, this.player.maxHp) - this.player.hp;
        const boostedHeal = applyHealingBonus(baseHeal, this.player.healMult);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + boostedHeal);
      }
    }
  }

  spawnDamageText(wx: number, wy: number, txt: string | number, color = '#fff', isCrit = false): void {
    const el = UI.spawnDamageText(wx, wy, txt, color, isCrit);
    if (!el) return;
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

  private capturePrevPositions(): void {
    if (this.player) {
      this.player.savePrevPosition();
    }

    this.enemies.forEach(enemy => enemy.savePrevPosition());
    this.projectiles.forEach(projectile => projectile.savePrevPosition());
    this.fireballs.forEach(fireball => fireball.savePrevPosition());
    this.loot.forEach(item => item.savePrevPosition());
    this.particles.forEach(particle => particle.savePrevPosition());
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

    if (p.hpRegen > 0 && this.frames % 60 === 0) {
      const regen = applyHealingBonus(p.hpRegen, p.healMult);
      if (regen > 0) {
        p.hp = Math.min(p.maxHp, p.hp + regen);
      }
    }

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
          p.ultName === 'ShadowStep' && p.ultActiveTime > 0
        );
      }

      const damageResult = calculateWeaponDamage(w.baseDmg + p.flatDamage, p.dmgMult, p.critChance);
      const dmg = damageResult.damage;
      const isCrit = damageResult.isCrit;

      // Handle aura separately (returns early)
      if (w.type === 'aura' && w.area) {
        const result = fireWeapon('aura', w.id, { x: p.x, y: p.y }, this.enemies, w, dmg, isCrit, 1 + p.items.pierce, this.input.lastDx, this.input.lastDy, this.input.aimAngle, this.frames, p.items.projectile);
        if (result.fired && result.auraDamage) {
          p.auraAttackFrame = 0;
          const auraArea = applyAreaBonus(result.auraDamage.area, p.areaFlat, p.areaPercent);
          this.enemies.forEach(e => {
            if (Utils.getDist(p.x, p.y, e.x, e.y) < auraArea) {
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
              const duration = applyDurationBonus(projData.duration, p.durationBonus);
              const proj = new Projectile(
                projData.x,
                projData.y,
                projData.vx,
                projData.vy,
                projData.radius,
                projData.color,
                projData.dmg,
                duration,
                projData.pierce,
                projData.isCrit,
                false,
                w.id
              );
              if (projData.isBubble) {
                (proj as any).isBubble = true;
              }
              if (projData.splits) (proj as any).splits = true;
              if (projData.isArc) (proj as any).isArc = true;
              if (projData.explodeRadius) {
                proj.explodeRadius = applyAreaBonus(projData.explodeRadius, p.areaFlat, p.areaPercent);
              }
              if (projData.knockback) proj.knockback = projData.knockback;
              if (w.id === 'bow') {
                (proj as any).spriteId = 'weapons/arrow';
              }
              this.projectiles.push(proj);
            }
          }

          // Create fireballs from result data
          if (result.fireballs) {
            for (const fbData of result.fireballs) {
              const duration = applyDurationBonus(fbData.duration, p.durationBonus);
              const fireball = new FireballProjectile(
                fbData.startX,
                fbData.startY,
                fbData.targetX,
                fbData.targetY,
                fbData.speed,
                fbData.dmg,
                duration,
                fbData.pierce,
                fbData.isCrit,
                w.id
              );
              if (fbData.explodeRadius) {
                fireball.explodeRadius = applyAreaBonus(fbData.explodeRadius, p.areaFlat, p.areaPercent);
              }
              if (fbData.trailDamage) fireball.trailDamage = fbData.trailDamage;
              this.fireballs.push(fireball);
            }
          }

          // Handle cleave weapon effects (shield bash - shoots shield sprite at nearest)
          if (result.cleave) {
            const { baseAngle, range: baseRange } = result.cleave;
            const range = applyAreaBonus(baseRange, p.areaFlat, p.areaPercent);

            // Find nearest enemy for direction
            let nearestDist = Infinity;
            let nearestAngle = baseAngle;
            for (const e of this.enemies) {
              const d = Utils.getDist(p.x, p.y, e.x, e.y);
              if (d < nearestDist) {
                nearestDist = d;
                let edx = e.x - p.x;
                let edy = e.y - p.y;
                if (edx > CONFIG.worldSize / 2) edx -= CONFIG.worldSize;
                if (edx < -CONFIG.worldSize / 2) edx += CONFIG.worldSize;
                if (edy > CONFIG.worldSize / 2) edy -= CONFIG.worldSize;
                if (edy < -CONFIG.worldSize / 2) edy += CONFIG.worldSize;
                nearestAngle = Math.atan2(edy, edx);
              }
            }

            // Shoot shield projectile
            const speed = 6;
            const proj = new Projectile(
              p.x,
              p.y,
              Math.cos(nearestAngle) * speed,
              Math.sin(nearestAngle) * speed,
              8, // Larger radius (16x16 sprite)
              '#8899aa',
              dmg,
              range / speed, // Duration based on range
              1,
              isCrit,
              false,
              w.id || 'shield_bash'
            );
            proj.knockback = w.knockback || 8;
            proj.spriteId = 'shield_bash'; // Use the sprite
            this.projectiles.push(proj);
          }

          // Handle spray weapon effects
          if (result.spray) {
            const { baseAngle, isLighter, gasColor, pelletCount, spreadAmount, coneLength: baseConeLength } = result.spray;
            const coneLength = applyAreaBonus(baseConeLength, p.areaFlat, p.areaPercent);

            // Spawn gas cloud particles (pepper spray ONLY)
            // Lighter now uses a unified high-fidelity shader cone
            if (!isLighter) {
              for (let i = 0; i < 6; i++) {
                const dist = 10 + Math.random() * 80;
                const gasSpread = spreadAmount;
                const spreadAngle = baseAngle + (Math.random() - 0.5) * gasSpread;
                this.spawnParticles({
                  type: 'gas' as ParticleType,
                  x: p.x + Math.cos(spreadAngle) * dist + (Math.random() - 0.5) * 10,
                  y: p.y + Math.sin(spreadAngle) * dist + (Math.random() - 0.5) * 10,
                  size: 7 + Math.random() * 5,
                  vx: Math.cos(spreadAngle) * 0.3 + (Math.random() - 0.5) * 0.5,
                  vy: Math.sin(spreadAngle) * 0.3 + (Math.random() - 0.5) * 0.5,
                  color: gasColor
                }, 1);
              }
            }

            // Fire particles (DIBALED: Now handled by cinematic shader cone)

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
                  isCrit,
                  false,
                  w.id || 'pepper_spray'
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
                    // Add outward knockback to counteract "sucking" feel
                    const kbAngle = Math.atan2(edy, edx);
                    const newPos = applyKnockback(e, kbAngle, 4); // 4 units outward
                    e.x = newPos.x;
                    e.y = newPos.y;
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

    // Spawn bubble trail particles - less frequent (every 3 frames)
    this.projectiles.forEach(proj => {
      if ((proj as any).isBubble && this.frames % 3 === 0) {
        // Occasional sparkle
        if (Math.random() > 0.6) {
          this.spawnParticles({
            type: 'splash' as ParticleType,
            x: proj.x + (Math.random() - 0.5) * 8,
            y: proj.y + (Math.random() - 0.5) * 8,
            size: 1 + Math.random() * 2,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.3 - Math.random() * 0.3,
            color: '#aaddff'
          }, 1);
        }
      }

      // Shield sprite trail - tiny faint particles
      if ((proj as any).spriteId === 'shield_bash' && this.frames % 4 === 0) {
        for (let i = 0; i < 2; i++) {
          this.spawnParticles({
            type: 'splash' as ParticleType,
            x: proj.x + (Math.random() - 0.5) * 12,
            y: proj.y + (Math.random() - 0.5) * 12,
            size: 0.05,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            color: '#555566'
          }, 1);
        }
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
          const dmg = applyArmorReduction(5, p.armor);
          p.hp -= dmg;
          this.spawnDamageText(p.x, p.y, `-${dmg}`, '#f00');
          if (p.hp <= 0) this.gameOver(false);
        }
      }
    });

    // Projectile collisions - shared hit tracking per weapon so stacked projectiles take turns
    const weaponHitLists = new Map<string, Enemy[]>();
    for (const proj of this.projectiles) {
      if (proj.isHostile) {
        // Hits player
        if (Utils.getDist(proj.x, proj.y, p.x, p.y) < proj.radius + p.radius) {
          if (hasDamageImmunity(p.ultName, p.ultActiveTime)) {
            proj.marked = true;
            continue;
          }
          const dmg = applyArmorReduction(proj.dmg, p.armor);
          p.hp -= dmg;
          this.spawnDamageText(p.x, p.y, `-${dmg}`, '#f00');
          proj.marked = true;
          if (p.hp <= 0) this.gameOver(false);
        }
      } else {
        // Get or create hit list for this weapon
        const weaponId = proj.weaponId || 'unknown';
        let sharedHitList = weaponHitLists.get(weaponId);
        if (!sharedHitList) {
          sharedHitList = [];
          weaponHitLists.set(weaponId, sharedHitList);
        }

        // Hits enemies
        for (const e of this.enemies) {
          // Skip if this projectile already hit this enemy, OR if another projectile of the same weapon hit it this pass
          if (proj.hitList.includes(e) || sharedHitList.includes(e)) continue;

          if (Utils.getDist(proj.x, proj.y, e.x, e.y) < proj.radius + e.radius) {
            this.hitEnemy(e, proj.dmg, proj.isCrit);
            proj.hitList.push(e);
            sharedHitList.push(e); // Mark as hit for all subsequent projectiles of this weapon

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
                    s.isCrit,
                    false,
                    proj.weaponId // Split bubbles inherit the same weapon ID
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
                if (!proj.hitList.includes(other) && !sharedHitList.includes(other)) {
                  this.hitEnemy(other, proj.dmg * explosionResult.damageMultiplier, proj.isCrit);
                  proj.hitList.push(other);
                  sharedHitList.push(other);
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
    }

    // Fireball collisions - shared hit tracking per weapon so stacked fireballs take turns
    const fireballHitLists = new Map<string, Enemy[]>();
    for (const fb of this.fireballs) {
      // Get or create hit list for this weapon
      const weaponId = fb.weaponId || 'unknown';
      let sharedFireballHitList = fireballHitLists.get(weaponId);
      if (!sharedFireballHitList) {
        sharedFireballHitList = [];
        fireballHitLists.set(weaponId, sharedFireballHitList);
      }

      for (const e of this.enemies) {
        // Skip if this fireball already hit this enemy, OR if another fireball of the same weapon hit it this pass
        if (fb.hitList.includes(e) || sharedFireballHitList.includes(e)) continue;

        if (Utils.getDist(fb.x, fb.y, e.x, e.y) < fb.radius + e.radius) {
          this.hitEnemy(e, fb.dmg, fb.isCrit);
          fb.hitList.push(e);
          sharedFireballHitList.push(e); // Mark as hit for all subsequent fireballs of this weapon

          // Explosion particles on hit
          this.spawnParticles({ type: 'fire' as ParticleType, x: fb.x, y: fb.y }, fb.getExplosionParticleCount());

          // Explosion radius (level 2+)
          if (fb.explodeRadius) {
            const explosionResult = findEnemiesInExplosion(fb.x, fb.y, fb.explodeRadius, this.enemies, [e]);
            for (const other of explosionResult.enemies) {
              if (!fb.hitList.includes(other) && !sharedFireballHitList.includes(other)) {
                this.hitEnemy(other, fb.dmg * explosionResult.damageMultiplier, fb.isCrit);
                fb.hitList.push(other);
                sharedFireballHitList.push(other);
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
    }

    // Trail damage (level 4+) - damage enemies near the fireball
    for (const fb of this.fireballs) {
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
    }

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

          if (l.type === 'orb' && l.item) {
            this.collectedLoot.push(l.item);
            UI.updateVeiledCount(this.collectedLoot.length);
            this.spawnDamageText(p.x, p.y, '+LOOT', '#facc15');
            return;
          }

          const effect = calculateLootEffect(l.type, l.val, p.hp, p.maxHp);
          if (effect.message) {
            this.spawnDamageText(p.x, p.y, effect.message, effect.color || '#fff');
          }

          if (effect.type === 'xp') {
            const xpGain = applyXpBonus(effect.xp || 0, p.xpMult);
            p.gainXp(xpGain, () => this.triggerLevelUp());
          } else if (effect.type === 'chest') {
            this.openChest();
          } else if (effect.type === 'heart') {
            const healAmount = applyHealingBonus(effect.hp || 0, p.healMult);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
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
    UI.updateWeaponSlots(p.weapons);

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
      const baseGold = e.type === 'boss' ? 100 : (e.type === 'elite' ? 10 : 1);
      const goldGain = applyGoldBonus(baseGold, this.player?.goldMult ?? 0);
      this.goldRun += goldGain;

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

      const luck = this.player?.luck ?? 0;
      const forceDrop = this.debugLootBoost;
      if (forceDrop || shouldDropItem(e.type, luck, this.mins)) {
        const itemType = rollItemType();
        const rollRelic = this.debugLootBoost && Math.random() < 0.1;
        const finalItemType = rollRelic ? 'relic' : itemType;
        const rarityBoost = rollRelic ? 3 : 0;
        const item = ItemGenerator.generate({
          itemType: finalItemType,
          luck,
          rarityBoost,
          minutesElapsed: this.mins,
          enemyType: e.type,
        });
        this.loot.push(new Loot(e.x, e.y, 'orb', item));
      }
    }
  }

  openChest(): void {
    const baseGold = calculateChestGold();
    const goldGain = applyGoldBonus(baseGold, this.player?.goldMult ?? 0);
    this.goldRun += goldGain;
    this.spawnDamageText(this.player?.x || 0, this.player?.y || 0, `+${goldGain}G`, '#fbbf24');
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

  render(alpha = 1): void {
    if (!this.active || !this.player) return;

    const p = this.player;
    const interpPlayer = this.getInterpolatedPosition(p, alpha);

    // Render main scene with Three.js - passing actual entity objects
    threeRenderer.render(
      p,
      this.enemies,
      this.projectiles,
      this.loot,
      this.fireballs,
      this.particles,
      this.obstacles,
      window.innerWidth,
      window.innerHeight,
      alpha,
      this.input.aimAngle
    );

    // Render UI (health bar, joysticks)
    threeRenderer.renderUI(
      p.hp,
      p.maxHp,
      interpPlayer.x,
      interpPlayer.y,
      {
        hasTouch: false,
        joyActive: this.input.joy.active,
        joyX: this.input.joy.x,
        joyY: this.input.joy.y,
        aimJoyActive: this.input.aimJoy.active,
        aimJoyX: this.input.aimJoy.x,
        aimJoyY: this.input.aimJoy.y,
      }
    );
  }

  loop(currentTime = 0): void {
    if (!this.lastTime) this.lastTime = currentTime;
    if (!this.fpsLastTime) this.fpsLastTime = currentTime;
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // FPS tracking
    this.fpsFrames++;
    if (currentTime - this.fpsLastTime >= 1000) {
      this.fpsFrames = 0;
      this.fpsLastTime = currentTime;
    }

    this.accumulator += deltaTime;

    // Cap accumulator to prevent spiral death on alt-tab (max 100ms catchup)
    if (this.accumulator > 100) {
      this.accumulator = 100;
    }

    // Fixed timestep update - run update() exactly 60 times per second
    while (this.accumulator >= this.timestep) {
      this.capturePrevPositions();
      this.update();
      this.accumulator -= this.timestep;
    }

    const alpha = this.accumulator / this.timestep;
    this.render(alpha);

    requestAnimationFrame((t) => this.loop(t));
  }
}

export const Game = new GameCore();
export { GameCore };
