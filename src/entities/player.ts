import { CONFIG } from '../config';
import type { CanvasContext } from '../types';
import type { Weapon, WeaponType, ItemType, UpgradeType } from '../types';
import { createEmptyStats, type StatBlock } from '../items/stats';
import { Entity, type ScreenPosition } from './entity';
import { Renderer } from '../systems/renderer';

export interface PlayerItems {
  pierce: number;
  cooldown: number;
  projectile: number;
}

export interface PlayerInventory {
  [key: string]: number;
}

export class Player extends Entity {
  charId: string;
  maxHp: number;
  speed: number;
  pickupRange: number;
  dmgMult: number;
  flatDamage: number;
  critChance: number;
  items: PlayerItems;
  luck: number;
  armor: number;
  hpRegen: number;
  areaFlat: number;
  areaPercent: number;
  durationBonus: number;
  healMult: number;
  goldMult: number;
  xpMult: number;
  loadoutStats: StatBlock;
  xp: number;
  level: number;
  nextXp: number;
  weapons: Weapon[];
  inventory: PlayerInventory;
  ultName: string;
  ultCharge: number;
  ultMax: number;
  ultActiveTime: number;
  auraAttackFrame: number;

  constructor(
    charId: string,
    hpMod: number,
    spdMod: number,
    weapon: WeaponType,
    ult: string,
    shopUpgrades: { health: number; speed: number; magnet: number; damage: number },
    loadoutStats: StatBlock = createEmptyStats()
  ) {
    super(CONFIG.worldSize / 2, CONFIG.worldSize / 2, 12, CONFIG.colors.player);

    this.charId = charId;
    const baseHp = (100 + (shopUpgrades.health * 20)) * hpMod;
    const baseSpeed = (7.5 * (1 + (shopUpgrades.speed * 0.05))) * spdMod;
    const basePickup = 60 * (1 + (shopUpgrades.magnet * 0.2));
    const baseDmgMult = 1 + (shopUpgrades.damage * 0.1);

    this.loadoutStats = loadoutStats;
    this.maxHp = baseHp * (1 + loadoutStats.allStats) + loadoutStats.maxHp;
    this.hp = this.maxHp;
    this.speed = baseSpeed * (1 + loadoutStats.allStats) + loadoutStats.speed;
    this.pickupRange = basePickup * (1 + loadoutStats.allStats) + loadoutStats.magnet + loadoutStats.pickupRadius;
    this.dmgMult = baseDmgMult + loadoutStats.percentDamage + loadoutStats.allStats;
    this.flatDamage = loadoutStats.flatDamage;
    this.critChance = 0;
    this.items = {
      pierce: loadoutStats.pierce,
      cooldown: loadoutStats.cooldownReduction,
      projectile: loadoutStats.projectiles,
    };
    this.luck = loadoutStats.luck;
    this.armor = loadoutStats.armor;
    this.hpRegen = loadoutStats.hpRegen;
    this.areaFlat = loadoutStats.areaFlat;
    this.areaPercent = loadoutStats.areaPercent;
    this.durationBonus = loadoutStats.duration * 10;
    this.healMult = 1 + loadoutStats.percentHealing;
    this.goldMult = loadoutStats.percentGold;
    this.xpMult = loadoutStats.percentXp;
    this.xp = 0;
    this.level = 1;
    this.nextXp = 5;
    this.weapons = [];
    this.inventory = {};
    this.ultName = ult;
    this.ultCharge = 0;
    this.ultMax = 1000;
    this.ultActiveTime = 0;
    this.auraAttackFrame = 0;

    this.addUpgrade(weapon);
  }

  get hp(): number { return this._hp; }
  set hp(value: number) { this._hp = Math.max(0, value); }
  private _hp: number = 100;

  drawShape(ctx: CanvasContext, pos: ScreenPosition): void {
    const { sx, sy } = pos;
    Renderer.drawSprite(ctx, this.charId, sx, sy, 2.5);

    if (this.ultName === 'IronWill' && this.ultActiveTime > 0) {
      ctx.strokeStyle = '#4af';
      ctx.beginPath();
      ctx.arc(sx, sy, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  addUpgrade(id: UpgradeType): void {
    const items: ItemType[] = ['pierce', 'damage', 'cooldown', 'scope', 'projectile'];

    if (items.includes(id as ItemType)) {
      switch (id) {
        case 'pierce': this.items.pierce++; break;
        case 'damage': this.dmgMult += 0.2; break;
        case 'cooldown': this.items.cooldown += 0.1; break;
        case 'scope': this.critChance += 0.15; break;
        case 'projectile': this.items.projectile++; break;
      }
      this.inventory[id] = (this.inventory[id] || 0) + 1;
    } else {
      const weaponType = id as WeaponType;

      if (!this.inventory[weaponType]) {
        let weapon: Weapon;
        switch (weaponType) {
          case 'bubble_stream':
            weapon = { id: 'bubble_stream', cd: 60, dmg: 12, type: 'bubble', curCd: 0, level: 1, baseDmg: 12 };
            break;
          case 'frying_pan':
            weapon = { id: 'frying_pan', cd: 70, dmg: 35, type: 'arc', curCd: 0, level: 1, baseDmg: 35 };
            break;
          case 'thrown_cds':
            weapon = { id: 'thrown_cds', cd: 25, dmg: 9, type: 'facing', curCd: 0, level: 1, baseDmg: 9 };
            break;
          case 'fireball':
            weapon = { id: 'fireball', cd: 133, dmg: 25, type: 'fireball', curCd: 0, level: 1, baseDmg: 25, projectileCount: 2 };
            break;
          case 'lighter':
            weapon = { id: 'lighter', cd: 3, dmg: 1, type: 'spray', curCd: 0, level: 1, baseDmg: 1 };
            break;
          case 'shield_bash':
            weapon = { id: 'shield_bash', cd: 25, dmg: 25, type: 'cleave', curCd: 0, level: 1, baseDmg: 25, coneLength: 60, coneWidth: 0.6, knockback: 8 };
            break;
          case 'bow':
            weapon = { id: 'bow', cd: 30, dmg: 8, type: 'nearest', curCd: 0, level: 1, baseDmg: 8 };
            break;
          default:
            weapon = { id: 'bubble_stream', cd: 60, dmg: 12, type: 'bubble', curCd: 0, level: 1, baseDmg: 12 };
        }
        this.weapons.push(weapon);
        this.inventory[weaponType] = 1;
      } else {
        const w = this.weapons.find(w => w.id === weaponType);
        if (w) {
          w.level++;
          w.baseDmg *= 1.3;
          w.cd *= 0.9;
          if (w.type === 'aura' && w.area) w.area += 15;

          // Per-weapon upgrade effects
          switch (weaponType) {
            case 'bubble_stream':
              // Level 2: +1 projectile, Level 3: +speed, Level 4: splits, Level 5: +2 projectiles
              if (w.level === 2) w.projectileCount = 2;
              if (w.level === 3) w.speedMult = 1.5;
              if (w.level === 4) w.splits = true;
              if (w.level === 5) w.projectileCount = 3;
              break;
            case 'frying_pan':
              // Level 2: explosion, Level 3: knockback, Level 4: +1 projectile, Level 5: +size
              if (w.level === 2) w.explodeRadius = 40;
              if (w.level === 3) w.knockback = 5;
              if (w.level === 4) w.projectileCount = 2;
              if (w.level === 5) w.size = 14;
              break;
            case 'thrown_cds':
              // Level 2: +1 CD, Level 3: +speed, Level 4: pierce (handled by passive), Level 5: +2 CDs
              if (w.level === 2) w.projectileCount = 2;
              if (w.level === 3) w.speedMult = 1.4;
              if (w.level === 5) w.projectileCount = 3;
              break;
            case 'bow':
              // Level 2: +1 arrow, Level 3: +speed, Level 4: pierce, Level 5: +2 arrows
              if (w.level === 2) w.projectileCount = 2;
              if (w.level === 3) w.speedMult = 1.3;
              if (w.level === 5) w.projectileCount = 3;
              break;
            case 'fireball':
              // Level 2: +explosion radius, Level 3: +duration, Level 4: trail damage, Level 5: +1 fireball
              if (w.level === 2) w.explodeRadius = 50;
              if (w.level === 3) w.speedMult = 1.3; // Also affects duration via longer travel
              if (w.level === 4) w.trailDamage = 5;
              if (w.level === 5) w.projectileCount = 2;
              break;
            case 'lighter':
              // Level 2: +cone length, Level 3: +cone width, Level 4: fire particles travel even farther, Level 5: +burn damage
              if (w.level === 2) w.coneLength = 150;
              if (w.level === 3) w.spread = 1.8;
              if (w.level === 4) w.coneLength = 200;
              if (w.level === 5) w.speedMult = 2.0;
              break;
            case 'shield_bash':
              // Level 2: +range, Level 3: wider cone, Level 4: +knockback, Level 5: +damage and knockback
              if (w.level === 2) w.coneLength = 80;
              if (w.level === 3) w.coneWidth = 0.9;
              if (w.level === 4) w.knockback = 12;
              if (w.level === 5) { w.coneLength = 100; w.knockback = 15; }
              break;
          }
          this.inventory[weaponType]++;
        }
      }
    }
  }

  gainXp(amt: number, onLevelUp: () => void): void {
    this.xp += amt;
    this.ultCharge = Math.min(this.ultMax, this.ultCharge + amt * 5);

    if (this.xp >= this.nextXp) {
      this.xp -= this.nextXp;
      this.level++;
      let xpMultiplier = 1.5;
      if (this.level >= 10 && this.level < 20) {
        xpMultiplier = 1.25;
      }
      this.nextXp *= xpMultiplier;
      onLevelUp();
    }
  }
}
