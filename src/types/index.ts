// Core type definitions for Survivor Protocol
import type { Item, ItemRarity, ItemType as LootItemType } from '../items/types';

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

export type SpriteKey = 'paladin' | 'rogue' | 'knight' | 'berserker' | 'wizard' | 'pyromancer' | 'ranger' | 'shopper' | 'sprinter' | 'armored' | 'manager' | 'basic' | 'bat' | 'elite' | 'boss' | 'gem' | 'chest' | 'heart';

export type PaletteKey = '.' | 's' | 'b' | 'd' | 'g' | 'r' | 'p' | 'w' | '1' | '2' | '3' | 'k' | 'e' | 'y';

// Strict palette type - only allows defined keys (compile-time error for undefined colors)
export type Palette = Record<PaletteKey, string | null>;

// Strict sprites type - only allows defined sprite keys
export type Sprites = Record<SpriteKey, string[]>;

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

export type WeaponType = 'bubble_stream' | 'frying_pan' | 'thrown_cds' | 'fireball' | 'lighter' | 'shield_bash' | 'bow';
export type ItemType = 'pierce' | 'scope' | 'damage' | 'cooldown' | 'projectile' | 'projectileSpeed';
export type UpgradeType = WeaponType | ItemType;

export interface Upgrade {
  name: string;
  type: 'Weapon' | 'Item';
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
  projectileCount?: number;
  explodeRadius?: number;
  knockback?: number;
  size?: number;
  splits?: boolean;
  trailDamage?: number;
  coneLength?: number;
  coneWidth?: number;
}

export type Upgrades = Record<string, Upgrade>;

export interface Weapon {
  id: WeaponType;
  cd: number;
  dmg: number;
  type: 'nearest' | 'facing' | 'aura' | 'arc' | 'fireball' | 'spray' | 'bubble' | 'cleave';
  area?: number;
  range?: number;
  falloff?: number;
  bounces?: number;
  pierce?: number;
  curCd: number;
  level: number;
  baseDmg: number;
  manual?: boolean; // Requires button press to fire
  // Upgrade-specific properties
  projectileCount?: number; // Number of projectiles per shot
  speedMult?: number; // Projectile speed multiplier
  spread?: number; // Spray cone width (for spray type)
  pelletCount?: number; // Number of pellets (for pepper spray)
  explodeRadius?: number; // Explosion radius on impact
  knockback?: number; // Knockback force
  size?: number; // Projectile size
  splits?: boolean; // Bubbles split into smaller bubbles on hit
  trailDamage?: number; // Fireball trail deals damage
  coneLength?: number; // Lighter cone length / cleave range
  coneWidth?: number; // Cleave cone width in radians
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
  shopInventory: ShopInventoryData;
  stash: Array<Item | null>;
  loadout: LoadoutData;
}

export interface LoadoutData {
  relic: Item | null;
  weapon: Item | null;
  helm: Item | null;
  armor: Item | null;
  accessory1: Item | null;
  accessory2: Item | null;
  accessory3: Item | null;
}

export interface ShopUpgrades {
  damage: number;
  health: number;
  speed: number;
  magnet: number;
  safeSlotsCount: number;
  [key: string]: number;
}

export interface ShopItemListing {
  item: Item | null; // null for veiled items
  veiled: boolean;
  rarity: ItemRarity;
  type: LootItemType;
  price: number;
  listedAt: number;
  expiresAt: number;
}

export interface ShopInventoryData {
  items: ShopItemListing[];
  gamblerItems: ShopItemListing[];
  lastRefresh: number;
  lastDailyRefresh: number;
}

export interface ExtractionZone {
  x: number;
  y: number;
  radius: number;
  spawnTime: number;
  expiresAt: number;
  active: boolean;
  extractionProgress: number;
  inZone: boolean;
  enemiesSpawned: boolean;
}

export interface ExtractionState {
  currentZone: ExtractionZone | null;
  lastSpawnTime: number;
  nextSpawnTime: number;
  warningEndTime: number;
  pendingZone: { x: number; y: number } | null;
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
  joy: JoystickState; // Movement joystick (left side on mobile)
  aimJoy: JoystickState; // Aim joystick (right side on mobile)
  ult: boolean;
  lastDx?: number;
  lastDy?: number;
  aimAngle?: number; // Aim angle in radians (from mouse or aim joystick)
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
