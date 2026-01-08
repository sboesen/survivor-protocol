import { CONFIG } from '../config';
import type { CanvasContext } from '../types';
import type { Weapon, WeaponType, ItemType, UpgradeType } from '../types';
import { createEmptyStats, type StatBlock } from '../items/stats';
import { Entity, type ScreenPosition } from './entity';
import { Renderer } from '../systems/renderer';
import { WEAPON_LEVELS, UNIVERSAL_UPGRADES } from '../data/leveling';

export interface PlayerItems {
  pierce: number;
  cooldown: number;
  projectile: number;
  projectileSpeed: number;
}

export interface PlayerInventory {
  [key: string]: number;
}

export class Player extends Entity {
  charId: string;
  private baseHp: number;
  private baseSpeed: number;
  private basePickup: number;
  private baseDmgMult: number;
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
  ricochetDamageBonus: number;
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

    this.baseHp = baseHp;
    this.baseSpeed = baseSpeed;
    this.basePickup = basePickup;
    this.baseDmgMult = baseDmgMult;

    this.loadoutStats = createEmptyStats();
    this.maxHp = baseHp;
    this.hp = this.maxHp;
    this.speed = baseSpeed;
    this.pickupRange = basePickup;
    this.dmgMult = baseDmgMult;
    this.flatDamage = 0;
    this.critChance = 0;
    this.items = {
      pierce: 0,
      cooldown: 0,
      projectile: 0,
      projectileSpeed: 0,
    };
    this.ricochetDamageBonus = 0;
    this.luck = 0;
    this.armor = 0;
    this.hpRegen = 0;
    this.areaFlat = 0;
    this.areaPercent = 0;
    this.durationBonus = 0;
    this.healMult = 1;
    this.goldMult = 0;
    this.xpMult = 0;
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

    this.updateLoadoutStats(loadoutStats, true);
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
    const items: ItemType[] = ['pierce', 'damage', 'cooldown', 'scope', 'projectile', 'projectileSpeed'];

    if (items.includes(id as ItemType)) {
      switch (id) {
        case 'pierce': this.items.pierce++; break;
        case 'damage': this.dmgMult += 0.2; break;
        case 'cooldown': this.items.cooldown += 0.1; break;
        case 'scope': this.critChance += 0.15; break;
        case 'projectile': this.items.projectile++; break;
        case 'projectileSpeed': this.items.projectileSpeed += 0.2; break;
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
            weapon = { id: 'bow', cd: 30, dmg: 8, type: 'nearest', curCd: 0, level: 1, baseDmg: 8, bounces: 0 };
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
          w.baseDmg *= UNIVERSAL_UPGRADES.dmg;
          w.cd *= UNIVERSAL_UPGRADES.cd;
          if (w.type === 'aura' && w.area) w.area += UNIVERSAL_UPGRADES.auraArea;

          // Per-weapon upgrade effects from data
          const levels = WEAPON_LEVELS[weaponType];
          if (levels && levels[w.level]) {
            Object.assign(w, levels[w.level]);
          }

          this.inventory[weaponType]++;
        }
      }
    }
  }

  updateLoadoutStats(stats: StatBlock, resetHp = false): void {
    this.loadoutStats = stats;

    const prevHp = this.hp;
    this.maxHp = this.baseHp * (1 + stats.allStats) + stats.maxHp;
    if (resetHp) {
      this.hp = this.maxHp;
    } else {
      this.hp = Math.min(this.maxHp, prevHp);
    }

    this.speed = this.baseSpeed + stats.speed + (this.baseSpeed * stats.allStats);
    this.pickupRange = this.basePickup + stats.magnet + stats.pickupRadius + (this.basePickup * stats.allStats);
    this.dmgMult = this.baseDmgMult + stats.percentDamage + (this.baseDmgMult * stats.allStats);
    this.flatDamage = stats.flatDamage;
    this.items = {
      pierce: stats.pierce,
      cooldown: stats.cooldownReduction,
      projectile: stats.projectiles,
      projectileSpeed: stats.projectileSpeed,
    };
    this.ricochetDamageBonus = stats.ricochetDamage;
    this.luck = stats.luck;
    this.armor = stats.armor;
    this.hpRegen = stats.hpRegen;
    this.areaFlat = stats.areaFlat;
    this.areaPercent = stats.areaPercent;
    this.durationBonus = stats.duration * 10;
    this.healMult = 1 + stats.percentHealing;
    this.goldMult = stats.percentGold;
    this.xpMult = stats.percentXp;
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
