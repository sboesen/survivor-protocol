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
import { Loot } from './entities/loot';
import { Obstacle } from './entities/obstacle';
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

  player: Player | null = null;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  loot: Loot[] = [];
  obstacles: Obstacle[] = [];
  damageTexts: DamageText[] = [];

  input: InputState = {
    x: 0,
    y: 0,
    keys: {},
    joy: { active: false, x: 0, y: 0, ox: 0, oy: 0 },
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
      if (e.code === 'Space') this.triggerUlt();
    };
    window.onkeyup = (e) => {
      this.input.keys[e.key] = false;
    };

    // Touch/joystick input
    const tz = this.canvas;
    tz.ontouchstart = (e) => {
      e.preventDefault();
      this.input.joy.active = true;
      this.input.joy.ox = e.touches[0].clientX;
      this.input.joy.oy = e.touches[0].clientY;
    };
    tz.ontouchmove = (e) => {
      e.preventDefault();
      if (!this.input.joy.active) return;
      const dx = e.touches[0].clientX - this.input.joy.ox;
      const dy = e.touches[0].clientY - this.input.joy.oy;
      const dist = Math.hypot(dx, dy);
      const scale = Math.min(dist, 50) / 50;
      const angle = Math.atan2(dy, dx);
      this.input.joy.x = Math.cos(angle) * scale;
      this.input.joy.y = Math.sin(angle) * scale;
    };
    tz.ontouchend = () => {
      this.input.joy.active = false;
      this.input.joy.x = 0;
      this.input.joy.y = 0;
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
    this.loot = [];
    this.damageTexts = [];
    this.obstacles = [];

    const spawnX = CONFIG.worldSize / 2;
    const spawnY = CONFIG.worldSize / 2;
    const safeZone = 200; // Keep area around spawn clear

    // Generate obstacles (away from spawn point)
    for (let i = 0; i < 40; i++) {
      let ox, oy;
      let attempts = 0;
      do {
        ox = Utils.rand(0, CONFIG.worldSize);
        oy = Utils.rand(0, CONFIG.worldSize);
        attempts++;
      } while (attempts < 10 && Utils.getDist(ox, oy, spawnX, spawnY) < safeZone);

      this.obstacles.push(new Obstacle(
        ox, oy,
        Utils.rand(60, 150),
        Utils.rand(60, 150),
        Math.random() > 0.9 ? 'font' : 'ruin'
      ));
    }

    UI.updateHud(0, 0, 1, 0, char.id);
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
        case 'Shield':
          this.player.ultActiveTime = 300;
          this.spawnDamageText(this.player.x, this.player.y, 'SHIELD UP!', '#fff');
          break;
        case 'Haste':
          this.player.ultActiveTime = 300;
          this.spawnDamageText(this.player.x, this.player.y, 'MAX SPEED!', '#fff');
          break;
        case 'Freeze':
          this.timeFreeze = 240;
          this.spawnDamageText(this.player.x, this.player.y, 'TIME STOP!', '#0ff');
          break;
        case 'Rage':
          for (let i = 0; i < 12; i++) {
            const ang = (Math.PI * 2 / 12) * i;
            const proj = new Projectile(
              this.player.x,
              this.player.y,
              Math.cos(ang) * 5,
              Math.sin(ang) * 5,
              20,
              '#f00',
              100,
              100,
              999,
              true
            );
            proj.isArc = true;
            this.projectiles.push(proj);
          }
          this.spawnDamageText(this.player.x, this.player.y, 'RAGE!', '#f00');
          break;
      }
    }
  }

  spawnDamageText(wx: number, wy: number, txt: string | number, color = '#fff', isCrit = false): void {
    const el = UI.spawnDamageText(wx, wy, txt, color, isCrit);
    this.damageTexts.push({ el, wx, wy, life: 50 });
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
        p.ultName === 'Haste' && p.ultActiveTime > 0 ? 1.5 : 1
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
          if (dist < 40 && this.frames % 30 === 0 && p.hp < p.maxHp) {
            p.hp++;
            this.spawnDamageText(p.x, p.y, '+', '#0f0');
          }
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
          this.enemies.push(new Enemy(p.x, p.y, 'boss', this.mins));
        }
      } else {
        this.enemies.push(new Enemy(p.x, p.y, type, this.mins));
      }
    }

    // Weapons
    p.weapons.forEach(w => {
      if (w.curCd > 0) {
        w.curCd -= (1 + p.passives.cooldown) * (
          p.ultName === 'Haste' && p.ultActiveTime > 0 ? 2 : 1
        );
      }

      let dmg = w.baseDmg * p.dmgMult;
      const isCrit = Math.random() < p.critChance;
      if (isCrit) dmg *= 3;

      if (w.type === 'aura' && w.area) {
        if (this.frames % 20 === 0) {
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
              1 + p.passives.pierce,
              isCrit
            ));
            fired = true;
          }
        } else if (w.type === 'facing') {
          const vx = this.input.lastDx || 1;
          const vy = this.input.lastDy || 0;
          this.projectiles.push(new Projectile(
            p.x,
            p.y,
            vx * 10,
            vy * 10,
            4,
            '#f00',
            dmg,
            40,
            2 + p.passives.pierce,
            isCrit
          ));
          fired = true;
        } else if (w.type === 'arc') {
          const vx = (Math.random() - 0.5) * 4;
          const proj = new Projectile(
            p.x,
            p.y,
            vx,
            -10,
            10,
            '#aaa',
            dmg * 2,
            60,
            5,
            isCrit
          );
          proj.isArc = true;
          this.projectiles.push(proj);
          fired = true;
        }

        if (fired) w.curCd = w.cd;
      }
    });

    // Update projectiles
    this.projectiles.forEach(proj => proj.update());

    // Update enemies
    this.enemies.forEach(e => e.update(p, this.timeFreeze));

    // Player-enemy collision
    this.enemies.forEach(e => {
      if (Utils.getDist(p.x, p.y, e.x, e.y) < p.radius + e.radius) {
        if (p.ultName === 'Shield' && p.ultActiveTime > 0) return;

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
          if (p.ultName === 'Shield' && p.ultActiveTime > 0) {
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
            proj.pierce--;
            if (proj.pierce <= 0) {
              proj.marked = true;
              break;
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

        l.x += ldx * 0.15;
        l.y += ldy * 0.15;

        if (d < 15) {
          l.marked = true;

          if (l.type === 'gem') {
            p.gainXp(l.val, () => this.triggerLevelUp());
          }
          if (l.type === 'chest') this.openChest();
          if (l.type === 'heart') {
            p.hp = Math.min(p.maxHp, p.hp + 30);
            this.spawnDamageText(p.x, p.y, '+HP', '#0f0');
          }
        }
      }
    });

    // Cleanup
    this.projectiles = this.projectiles.filter(x => !x.marked);
    this.enemies = this.enemies.filter(x => !x.marked);
    this.loot = this.loot.filter(x => !x.marked);
    this.damageTexts = this.damageTexts.filter(t => t.life > 0);

    // Update damage text positions
    UI.updateDamageTexts(this.damageTexts, p.x, p.y, this.frames);
    UI.updateUlt(p.ultCharge, p.ultMax);

    // Update HUD
    if (this.frames % 30 === 0) {
      UI.updateHud(this.goldRun, this.time, p.level, this.kills, SaveData.data.selectedChar);
    }
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

      UI.updateHud(this.goldRun, this.time, this.player?.level || 1, this.kills, SaveData.data.selectedChar);

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
      passives: this.player.passives,
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

    // Draw grid
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

    // Draw entities
    this.obstacles.forEach(o => o.draw(ctx, px, py, cw, ch));
    this.loot.forEach(l => l.draw(ctx, px, py, cw, ch));
    this.enemies.forEach(e => e.draw(ctx, px, py, cw, ch));
    this.projectiles.forEach(proj => proj.draw(ctx, px, py, cw, ch));
    p.draw(ctx, px, py, cw, ch);

    // Player health bar
    const hpPct = p.hp / p.maxHp;
    ctx.fillStyle = 'red';
    ctx.fillRect(cw / 2 - 15, ch / 2 + 18, 30, 4);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(cw / 2 - 15, ch / 2 + 18, 30 * hpPct, 4);
  }

  loop(): void {
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  }
}

export const Game = new GameCore();
