import { CONFIG } from '../config';
import type { CanvasContext } from '../types';
import type { Weapon, WeaponType, PassiveType, UpgradeType } from '../types';
import { Entity } from './entity';
import { Renderer } from '../systems/renderer';

export interface PlayerPassives {
  pierce: number;
  cooldown: number;
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
  critChance: number;
  passives: PlayerPassives;
  xp: number;
  level: number;
  nextXp: number;
  weapons: Weapon[];
  inventory: PlayerInventory;
  ultName: string;
  ultCharge: number;
  ultMax: number;
  ultActiveTime: number;

  constructor(
    charId: string,
    hpMod: number,
    spdMod: number,
    weapon: WeaponType,
    ult: string,
    shopUpgrades: { health: number; speed: number; magnet: number; damage: number }
  ) {
    super(CONFIG.worldSize / 2, CONFIG.worldSize / 2, 12, CONFIG.colors.player);

    this.charId = charId;
    this.maxHp = (100 + (shopUpgrades.health * 20)) * hpMod;
    this.hp = this.maxHp;
    this.speed = (3.5 * (1 + (shopUpgrades.speed * 0.05))) * spdMod;
    this.pickupRange = 60 * (1 + (shopUpgrades.magnet * 0.2));
    this.dmgMult = 1 + (shopUpgrades.damage * 0.1);
    this.critChance = 0;
    this.passives = { pierce: 0, cooldown: 0 };
    this.xp = 0;
    this.level = 1;
    this.nextXp = 5;
    this.weapons = [];
    this.inventory = {};
    this.ultName = ult;
    this.ultCharge = 0;
    this.ultMax = 1000;
    this.ultActiveTime = 0;

    this.addUpgrade(weapon);
  }

  get hp(): number { return this._hp; }
  set hp(value: number) { this._hp = Math.max(0, value); }
  private _hp: number = 100;

  drawShape(ctx: CanvasContext, x: number, y: number): void {

    // Draw Aura for orbit weapon
    if (this.inventory['orbit']) {
      const w = this.weapons.find(w => w.id === 'orbit');
      if (w && w.area) {
        ctx.beginPath();
        ctx.arc(x, y, w.area, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${0.1 + Math.sin(Date.now() * 0.003) * 0.05})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    Renderer.drawSprite(ctx, this.charId, x, y, 2.5);

    if (this.ultName === 'Security' && this.ultActiveTime > 0) {
      ctx.strokeStyle = '#4af';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  addUpgrade(id: UpgradeType): void {
    const passives: PassiveType[] = ['pierce', 'damage', 'cooldown', 'scope'];

    if (passives.includes(id as PassiveType)) {
      switch (id) {
        case 'pierce': this.passives.pierce++; break;
        case 'damage': this.dmgMult += 0.2; break;
        case 'cooldown': this.passives.cooldown += 0.1; break;
        case 'scope': this.critChance += 0.15; break;
      }
      this.inventory[id] = (this.inventory[id] || 0) + 1;
    } else {
      const weaponType = id as WeaponType;

      if (!this.inventory[weaponType]) {
        let weapon: Weapon;
        switch (weaponType) {
          case 'wand':
            weapon = { id: 'wand', cd: 50, dmg: 10, type: 'nearest', curCd: 0, level: 1, baseDmg: 10 };
            break;
          case 'orbit':
            weapon = { id: 'orbit', cd: 40, dmg: 5, type: 'aura', area: 90, curCd: 0, level: 1, baseDmg: 5 };
            break;
          case 'axe':
            weapon = { id: 'axe', cd: 70, dmg: 35, type: 'arc', curCd: 0, level: 1, baseDmg: 35 };
            break;
          case 'knife':
            weapon = { id: 'knife', cd: 25, dmg: 9, type: 'facing', curCd: 0, level: 1, baseDmg: 9 };
            break;
          default:
            weapon = { id: 'wand', cd: 50, dmg: 10, type: 'nearest', curCd: 0, level: 1, baseDmg: 10 };
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
      this.nextXp *= 1.5;
      onLevelUp();
    }
  }
}
