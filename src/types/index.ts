// Core type definitions for Survivor Protocol

export interface Config {
  worldSize: number;
  viewDist: number;
  colors: Colors;
}

export interface Colors {
  player: string;
  enemy: string;
  obstacle: string;
  gem: string;
}

export type SpriteKey = 'janitor' | 'skater' | 'mallCop' | 'foodCourt' | 'dungeonMaster' | 'teenager' | 'shopper' | 'sprinter' | 'armored' | 'manager';

export type PaletteKey = '.' | 's' | 'b' | 'd' | 'g' | 'r' | 'p' | 'w' | '1' | '2' | '3' | 'k' | 'e';

export interface Palette {
  [key: string]: string | null;
}

export interface Sprites {
  [key: string]: string[];
}

export interface Character {
  id: string;
  name: string;
  icon: string;
  weapon: WeaponType;
  hpMod: number;
  spdMod: number;
  ult: string;
  desc: string;
}

export type WeaponType = 'pepper_spray' | 'bubble_stream' | 'frying_pan' | 'thrown_cds' | 'fireball' | 'lighter';
export type PassiveType = 'pierce' | 'scope' | 'damage' | 'cooldown';
export type UpgradeType = WeaponType | PassiveType;

export interface Upgrade {
  name: string;
  type: 'Weapon' | 'Passive';
  desc: string;
  dmg?: number;
  cd?: number;
  area?: number;
  range?: number;
  falloff?: number;
  bounces?: number;
  pierce?: number;
  crit?: number;
  damageMult?: number;
  cooldownMult?: number;
}

export type Upgrades = Record<string, Upgrade>;

export interface Weapon {
  id: WeaponType;
  cd: number;
  dmg: number;
  type: 'nearest' | 'facing' | 'aura' | 'arc' | 'fireball' | 'spray' | 'bubble';
  area?: number;
  range?: number;
  falloff?: number;
  bounces?: number;
  curCd: number;
  level: number;
  baseDmg: number;
  manual?: boolean; // Requires button press to fire
}

export interface ShopItem {
  name: string;
  desc: string;
  cost: (level: number) => number;
  max: number;
}

export interface SaveGameData {
  gold: number;
  ownedChars: string[];
  selectedChar: string;
  shop: ShopUpgrades;
}

export interface ShopUpgrades {
  damage: number;
  health: number;
  speed: number;
  magnet: number;
  [key: string]: number;
}

export interface EnemyType {
  basic: string;
  bat: string;
  elite: string;
  boss: string;
}

export type EntityType = 'basic' | 'bat' | 'elite' | 'boss';

export interface LootType {
  gem: string;
  chest: string;
  heart: string;
}

export interface InputState {
  x: number;
  y: number;
  keys: Record<string, boolean>;
  joy: JoystickState;
  ult: boolean;
  lastDx?: number;
  lastDy?: number;
}

export interface JoystickState {
  active: boolean;
  x: number;
  y: number;
  ox: number;
  oy: number;
}

export interface DamageText {
  el: HTMLElement;
  wx: number;
  wy: number;
  life: number;
}

export interface GachaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  c: string;
}

// Canvas context type
export type CanvasContext = CanvasRenderingContext2D;
