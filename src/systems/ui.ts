import type { Item } from '../items/types';
import type { Weapon, ExtractionState } from '../types';
import { DamageTextSystem } from './ui/DamageTextSystem';
import { ExtractionHudSystem } from './ui/ExtractionHudSystem';
import { LevelUpSystem } from './ui/LevelUpSystem';
import { WeaponSlotsSystem } from './ui/WeaponSlotsSystem';
import { GameOverScreenSystem } from './ui/GameOverScreenSystem';
import { LevelInfoSystem } from './ui/LevelInfoSystem';
import { HudSystem } from './ui/HudSystem';
import { LootInventorySystem } from './ui/LootInventorySystem';
import { ItemSlotsSystem } from './ui/ItemSlotsSystem';
import { ExtractionScreenSystem } from './ui/ExtractionScreenSystem';

class UISystem {
  private cache: Record<string, HTMLElement | null> = {};
  private damageTextSystem = new DamageTextSystem();
  private extractionHudSystem = new ExtractionHudSystem();
  private levelUpSystem = new LevelUpSystem();
  private weaponSlotsSystem = new WeaponSlotsSystem();
  private gameOverScreenSystem = new GameOverScreenSystem();
  private levelInfoSystem = new LevelInfoSystem();
  private hudSystem = new HudSystem();
  private lootInventorySystem = new LootInventorySystem();
  private itemSlotsSystem = new ItemSlotsSystem();
  private extractionScreenSystem = new ExtractionScreenSystem();

  private getEl(id: string): HTMLElement | null {
    if (!(id in this.cache)) {
      this.cache[id] = document.getElementById(id);
    }
    return this.cache[id];
  }

  updateHud(
    gold: number,
    time: number,
    level: number,
    kills: number,
    selectedChar: string,
    particles: number = 0,
    enemies: number = 0
  ): void {
    this.hudSystem.updateHud(gold, time, level, kills, selectedChar, particles, enemies);
  }

  updateExtractionHud(state: ExtractionState, playerX: number, playerY: number, frames: number): void {
    this.extractionHudSystem.updateExtractionHud(state, playerX, playerY, frames);
  }

  hideExtractionHud(): void {
    this.extractionHudSystem.hideExtractionHud();
  }

  updateLootSummaryHud(items: Item[]): void {
    this.hudSystem.updateLootSummaryHud(items);
  }

  updateXp(current: number, max: number, level: number): void {
    this.hudSystem.updateXp(current, max, level);
  }

  updateUlt(current: number, max: number): void {
    this.hudSystem.updateUlt(current, max);
  }

  updateVeiledCount(count: number): void {
    this.hudSystem.updateVeiledCount(count);
  }

  updateItemSlots(_items: { pierce: number; cooldown: number; projectile: number }, inventory: Record<string, number>): void {
    this.itemSlotsSystem.updateItemSlots(_items, inventory);
  }

  spawnDamageText(
    wx: number,
    wy: number,
    txt: string | number,
    color = '#fff',
    isCrit = false
  ): HTMLElement | null {
    return this.damageTextSystem.spawnDamageText(wx, wy, txt, color, isCrit);
  }

  updateDamageTexts(
    texts: Array<{ el: HTMLElement; wx: number; wy: number; life: number }>,
    px: number,
    py: number,
    _frames: number
  ): void {
    this.damageTextSystem.updateDamageTexts(texts, px, py);
  }

  showGameOverScreen(
    success: boolean,
    goldRun: number,
    mins: number,
    kills: number,
    bossKills: number,
    securedItems: Item[] = []
  ): void {
    this.gameOverScreenSystem.showGameOverScreen(success, goldRun, mins, kills, bossKills, securedItems);
  }

  hideGameOverScreen(): void {
    this.gameOverScreenSystem.hideGameOverScreen();
  }

  showExtractionScreen(items: Item[], onContinue: () => void): void {
    this.extractionScreenSystem.showExtractionScreen(items, onContinue, this.getEl.bind(this), () => this.hideExtractionScreen());
  }

  hideExtractionScreen(): void {
    this.extractionScreenSystem.hideExtractionScreen(this.getEl.bind(this));
  }

  showLootInventory(items: Item[], safeSlotCount: number): void {
    this.lootInventorySystem.showLootInventory(items, safeSlotCount);
  }

  hideLootInventory(): void {
    this.lootInventorySystem.hideLootInventory();
  }

  showLevelUpScreen(
    choices: string[],
    inventory: Record<string, number>,
    currentStats: {
      items: { pierce: number; cooldown: number; projectile: number };
      critChance: number;
      dmgMult: number;
    },
    onSelect: (id: string) => void
  ): void {
    this.levelUpSystem.showLevelUpScreen(choices, inventory, currentStats, onSelect);
  }

  updateWeaponSlots(weapons: Weapon[]): void {
    this.weaponSlotsSystem.updateWeaponSlots(weapons, (weaponId) => this.showLevelInfo(weaponId));
  }

  showWeaponTooltip(weapon: Weapon, event?: MouseEvent): void {
    this.weaponSlotsSystem.showWeaponTooltip(weapon, event);
  }

  hideWeaponTooltip(): void {
    this.weaponSlotsSystem.hideWeaponTooltip();
  }

  showLevelInfo(weaponId: string, classId?: string): void {
    this.levelInfoSystem.showLevelInfo(weaponId, classId);
  }

  hideLevelInfo(): void {
    this.levelInfoSystem.hideLevelInfo();
  }

  setPlayer(player: { dmgMult: number; weapons: any[] }): void {
    this.weaponSlotsSystem.setPlayer(player);
  }
}

export const UI = new UISystem();
(window as any).UI = UI;
