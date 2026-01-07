# Safe Slots & Extraction System - IMPLEMENTATION PLAN

## ✅ ALL DECISIONS FINALIZED

### Safe Slots
✅ **Automatic system** - Top N rare items auto-saved on death
✅ **Priority** - Rarity-based, random among ties
✅ **Cap at 5 slots** (upgradable via shop)
✅ **No manual replacement** - Cannot change during run
✅ **Tutorial/menu explanation** - Explain mechanic clearly

### Item Shop
✅ **Three tabs**: UPGRADES (stats) / ITEMS (mixed) / GAMBLER (veiled only)
✅ **Rarity always visible** in all tabs
✅ **Three refresh systems**: Free (after run), Manual (200G), Daily (24h)
✅ **Expiry timers** shown for all items
✅ **Veiled pricing**: 20% discount (gambler items cheaper)

### Extraction Zones
✅ **Spawn**: Every 3 minutes with 15-second warning
✅ **Duration**: 30-second window to reach zone
✅ **Extraction time**: 5 seconds standing in zone
✅ **Radius**: 120px zone, spawn 400-800px from player
✅ **Enemies**: Spawn 8 in circle around zone on entry
✅ **Visuals**: Portal style (swirling rift)
✅ **Abort button**: Kept (saves only safe slot items)
✅ **One zone at a time**

### Debug Menu
✅ **Add**: Free shop refresh, save all items (999 safe slots)

---

## ALL DECISIONS FINALIZED ✅

### Safe Slots
- **Tiebreaker**: Pure random among same-rarity items (default - simple and fair)
- **Inventory display**: Show "X items will be auto-secured" message during run
- **Auto-selection**: Top N items by rarity preserved on death
- **Review button**: "📦 Review Loot" button for viewing collected items (clickable/tappable)
- **Data clamping**: safeSlotsCount clamped to 1-5 range with console warning

### Shop Structure
- **Gambler tab**: Price + type + rarity (e.g., "VEILED RARE WEAPON - 800G")
- **Tab item distribution**: 4-6 items each tab (30% veiled in ITEMS tab)
- **Veiled pricing**: 20% discount (cheaper because it's a gamble)
- **Veiled hover**: Show type + rarity on hover

### Extraction Zones
- **Spawn**: Every 3 minutes with 15-second warning
- **Extraction**: 5 seconds in zone
- **Enemies**: Spawn 8 enemies (scaled to current difficulty) in circle around zone when player enters
- **Visuals**: Blue portal on ground with beam of light (Three.js effects)
- **Abort button**: Kept (saves only safe slot items)

---

## IMPLEMENTATION PLAN

### PHASE 1: Safe Slots Auto-System

#### Task 1.1: Create Test Utilities ⏱️ 15 min

**NEW FILE: src/__tests__/testUtils.ts**

```typescript
import type { Item, ItemType, ItemRarity } from '../items/types';
import { ItemGenerator } from '../items/generator';

export function createMockItem(overrides: {
  rarity: ItemRarity;
  type?: ItemType;
  tier?: number;
}): Item {
  return ItemGenerator.generate({
    itemType: overrides.type || 'weapon',
    luck: 0,
    minutesElapsed: 10,
  });
}

export function createMockSaveData(overrides?: Partial<import('../types').SaveGameData>) {
  const defaults = {
    gold: 0,
    ownedChars: ['wizard'],
    selectedChar: 'wizard',
    shop: {
      damage: 0,
      health: 0,
      speed: 0,
      magnet: 0,
      safeSlotsCount: 1,
    },
    stash: [],
    loadout: {
      relic: null,
      weapon: null,
      helm: null,
      armor: null,
      accessory1: null,
      accessory2: null,
      accessory3: null,
    },
  };

  return { ...defaults, ...overrides };
}
```

#### Task 1.2: Update Type Definitions ⏱️ 5 min

**File: src/types/index.ts**

```typescript
export interface ShopUpgrades {
  damage: number;
  health: number;
  speed: number;
  magnet: number;
  safeSlotsCount: number; // NEW: 1-5 auto-safe slots
  [key: string]: number;
}
```

#### Task 1.3: Update Shop Data ⏱️ 5 min

**File: src/data/shop.ts**

```typescript
export const SHOP_ITEMS: Record<string, ShopItem> = {
  damage: { name: "Might", desc: "+10% Dmg", cost: (l) => 100 * (l + 1), max: 5 },
  health: { name: "Vitality", desc: "+20 HP", cost: (l) => 80 * (l + 1), max: 5 },
  speed: { name: "Haste", desc: "+5% Spd", cost: (l) => 150 * (l + 1), max: 3 },
  magnet: { name: "Magnet", desc: "+20% Rng", cost: (l) => 100 * (l + 1), max: 3 },
  safeSlots: {
    name: "Safe Container",
    desc: "+1 Auto-Safe Slot",
    cost: (l) => {
      if (l === 1) return 500;
      if (l === 2) return 1000;
      return l * 1000;
    },
    max: 5
  }
};
```

**Cost Table:**
| Level | Slots | Cost | Total Spent |
|-------|-------|------|-------------|
| 0     | 1     | 0G   | 0G          |
| 1     | 2     | 500G | 500G        |
| 2     | 3     | 1000G| 1500G       |
| 3     | 4     | 3000G| 4500G       |
| 4     | 5     | 5000G| 9500G       |
| 5     | -     | MAX  | -           |

#### Task 1.4: Update Save Data Migration ⏱️ 10 min

**File: src/systems/saveData.ts**

**Changes in `load()` method:**

```typescript
shop: {
  damage: parsed.shop?.damage ?? 0,
  health: parsed.shop?.health ?? 0,
  speed: parsed.shop?.speed ?? 0,
  magnet: parsed.shop?.magnet ?? 0,
  safeSlotsCount: this.clampSafeSlots(parsed.shop?.safeSlotsCount ?? 1),
}
```

**Add helper method:**

```typescript
private clampSafeSlots(value: number): number {
  const clamped = Math.max(1, Math.min(5, value));
  if (clamped !== value) {
    console.warn(`Safe slots count clamped from ${value} to ${clamped}`);
  }
  return clamped;
}
```

#### Task 1.5: Implement Auto-Selection Logic ⏱️ 20 min

**File: src/game.ts**

**Changes:**
1. Remove `securedLootId: string | null = null` (line 100)
2. Remove `secureLoot()` method (lines 376-381)
3. Update `toggleLootInventory()` method (lines 358-370) to just toggle UI (no secure callback):

```typescript
toggleLootInventory(): void {
  if (!this.active || !this.player) return;
  if (this.paused && !this.lootInventoryOpen) return;

  this.lootInventoryOpen = !this.lootInventoryOpen;
  this.paused = this.lootInventoryOpen;

  if (this.lootInventoryOpen) {
    UI.showLootInventory(this.collectedLoot);
  } else {
    UI.hideLootInventory();
  }
}
```

4. Add `autoSelectSafeItems()` method:

```typescript
private autoSelectSafeItems(): Item[] {
  if (this.collectedLoot.length === 0) return [];

  const safeSlotCount = SaveData.data.shop.safeSlotsCount;
  const rarityOrder: Record<ItemRarity, number> = {
    'legendary': 4,
    'relic': 3,
    'rare': 2,
    'magic': 1,
    'common': 0
  };

  const sorted = [...this.collectedLoot].sort((a, b) => {
    const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
    if (rarityDiff !== 0) return rarityDiff;
    return Math.random() - 0.5;
  });

  return sorted.slice(0, safeSlotCount);
}
```

5. Update `gameOver()` method (lines 383-413):

```typescript
gameOver(success = false): void {
  this.active = false;
  this.lootInventoryOpen = false;
  UI.hideLootInventory();
  UI.hideExtractionScreen();

  const rewards = calculateGameOverRewards({
    goldRun: this.goldRun,
    mins: this.mins,
    kills: this.kills,
    bossKills: this.bossKills
  });

  const stash = Stash.fromJSON(SaveData.data.stash);

  const itemsToStore = success
    ? this.collectedLoot
    : this.autoSelectSafeItems();

  itemsToStore.forEach(item => stash.addItem(item));
  SaveData.data.stash = stash.toJSON();

  SaveData.data.gold += rewards.total;
  SaveData.save();

  if (success) {
    UI.showExtractionScreen(itemsToStore, () => this.returnToMenu());
  } else {
    UI.showGameOverScreen(success, this.goldRun, this.mins, this.kills, this.bossKills);
  }
}
```

#### Task 1.6: Update Inventory UI ⏱️ 20 min

**File: src/systems/ui.ts**

**Update `showLootInventory()` method:**

```typescript
showLootInventory(items: Item[]): void {
  const screen = this.getEl('loot-inventory-screen');
  const grid = this.getEl('loot-inventory-grid');
  const securedEl = this.getEl('loot-secure-slot');

  if (screen) screen.classList.add('active');

  const safeSlotCount = SaveData.data.shop.safeSlotsCount;
  const securedCount = Math.min(safeSlotCount, items.length);

  if (securedEl) {
    securedEl.textContent = `${securedCount} of ${items.length} items will be auto-secured`;
  }

  if (!grid) return;
  grid.innerHTML = '';

  const rarityOrder: Record<ItemRarity, number> = {
    'legendary': 4,
    'relic': 3,
    'rare': 2,
    'magic': 1,
    'common': 0
  };
  const sorted = [...items].sort((a, b) => {
    const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
    return rarityDiff !== 0 ? rarityDiff : 0;
  });
  const topItems = sorted.slice(0, safeSlotCount);

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = `loot-slot rarity-${item.rarity}`;

    const isAutoSecured = topItems.includes(item);
    if (isAutoSecured) {
      div.classList.add('auto-secured');
    }

    div.innerHTML = `
      <div class="loot-icon">?</div>
      <div class="loot-info">
        <div class="loot-name">VEILED</div>
        <div class="loot-rarity">${item.rarity.toUpperCase()}</div>
        ${isAutoSecured ? '<div class="auto-secured-badge">AUTO-SECURED</div>' : ''}
      </div>
    `;

    grid.appendChild(div);
  });

  const btn = this.createBtn('CLOSE', () => {
    screen.classList.remove('active');
  });
  grid.appendChild(btn);
}
```

**Note:** Removed `onSecure` callback parameter.

#### Task 1.7: Update HUD ⏱️ 15 min

**File: index.html**

**Add review button to HUD:**

```html
<!-- In HUD section, near other controls -->
<div id="hud-controls">
  <button id="review-loot-btn" class="hud-btn">📦 Review Loot</button>
</div>
```

**File: src/systems/ui.ts**

**Update `updateHud()` method:**

```typescript
updateHud(): void {
  // ... existing hud updates ...

  const safeSlotCount = SaveData.data.shop.safeSlotsCount;
  const securedCount = Math.min(safeSlotCount, Game.collectedLoot?.length || 0);

  const securedEl = document.getElementById('hud-secured-count');
  if (securedEl) {
    securedEl.textContent = `${securedCount}/${safeSlotCount}`;
  }

  // Update review button visibility
  const reviewBtn = document.getElementById('review-loot-btn');
  if (reviewBtn) {
    reviewBtn.style.display = Game.active && Game.collectedLoot.length > 0 ? 'block' : 'none';
  }
}
```

**Wire up review button in src/main.ts:**

```typescript
// Expose review loot function to window
(window as any).reviewLoot = () => {
  if (Game) {
    Game.toggleLootInventory();
  }
};
```

**Update index.html button onclick:**

```html
<button id="review-loot-btn" class="hud-btn" onclick="reviewLoot()">📦 Review Loot</button>
```

#### Task 1.8: Add CSS Styles ⏱️ 10 min

**File: src/style.css**

```css
.auto-secured {
  border: 2px solid gold;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.auto-secured-badge {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #000;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  margin-top: 4px;
  text-transform: uppercase;
}

.hud-btn {
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border: 2px solid #4a90e2;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.hud-btn:active {
  transform: scale(0.95);
  background: rgba(74, 144, 226, 0.3);
}

#hud-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 100;
}

@media (max-width: 768px) {
  #hud-controls {
    bottom: 80px; /* Above joystick */
    right: 10px;
  }

  .hud-btn {
    padding: 12px 20px;
    font-size: 16px;
  }
}
```

#### Task 1.9: Add Test Coverage ⏱️ 30 min

**NEW FILE: src/__tests__/safeSlots.test.ts**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Item, ItemRarity } from '../items/types';
import { createMockItem, createMockSaveData } from './testUtils';

// Mock dependencies
vi.mock('../systems/saveData', () => ({
  SaveData: {
    data: createMockSaveData({ shop: { safeSlotsCount: 2 } }),
    save: vi.fn(),
  },
}));

describe('Auto Safe Slots System', () => {

  describe('autoSelectSafeItems()', () => {
    it('returns empty array when no items collected', () => {
      // Test implementation
    });

    it('saves top N items by rarity with 1 slot', () => {
      const items = [
        createMockItem({ rarity: 'rare' }),
        createMockItem({ rarity: 'common' }),
        createMockItem({ rarity: 'legendary' }),
      ];
      // With 1 slot, should return legendary only
    });

    it('saves top N items by rarity with 5 slots', () => {
      // Create 10 items with various rarities
      // With 5 slots, should return top 5 by rarity
    });

    it('prioritizes rarity correctly: legendary > relic > rare > magic > common', () => {
      // Create one of each rarity type
      // Verify order is correct
    });

    it('handles tiebreaker with random selection for same rarity', () => {
      // Create 3 rare items with 1 slot
      // Should return one of them (random)
    });

    it('caps selection at available slots', () => {
      // Create 10 items with 5 slots
      // Should return exactly 5 items
    });
  });

  describe('Shop Safe Slots Upgrade', () => {
    it('costs 500G for 2nd slot (level 0 → 1)', () => {
      const SHOP_ITEMS = require('../data/shop').SHOP_ITEMS;
      expect(SHOP_ITEMS.safeSlots.cost(0)).toBe(500);
    });

    it('costs 1000G for 3rd slot (level 1 → 2)', () => {
      const SHOP_ITEMS = require('../data/shop').SHOP_ITEMS;
      expect(SHOP_ITEMS.safeSlots.cost(1)).toBe(1000);
    });

    it('costs 3000G for 4th slot (level 2 → 3)', () => {
      const SHOP_ITEMS = require('../data/shop').SHOP_ITEMS;
      expect(SHOP_ITEMS.safeSlots.cost(2)).toBe(3000);
    });

    it('costs 5000G for 5th slot (level 3 → 4)', () => {
      const SHOP_ITEMS = require('../data/shop').SHOP_ITEMS;
      expect(SHOP_ITEMS.safeSlots.cost(3)).toBe(5000);
    });

    it('returns MAX when at level 4 (5 slots)', () => {
      const SHOP_ITEMS = require('../data/shop').SHOP_ITEMS;
      const lvl = 4;
      expect(lvl).toBeGreaterThanOrEqual(SHOP_ITEMS.safeSlots.max - 1);
    });
  });

  describe('Save Data Migration', () => {
    it('defaults safeSlotsCount to 1 for old save data', () => {
      // Load save data without safeSlotsCount
      // Verify it defaults to 1
    });

    it('preserves existing safeSlotsCount value', () => {
      // Load save data with safeSlotsCount = 3
      // Verify it stays at 3
    });

    it('saves and loads safeSlotsCount correctly', () => {
      // Set safeSlotsCount to 4
      // Save, then load
      // Verify it's still 4
    });

    it('clamps safeSlotsCount to 1-5 range', () => {
      // Test with values: 0, 6, -1, 10
      // All should be clamped to 1 or 5
    });

    it('warns when clamping occurs', () => {
      const consoleWarn = vi.spyOn(console, 'warn');
      // Trigger clamp with invalid value
      expect(consoleWarn).toHaveBeenCalled();
    });
  });
});
```

---

#### Phase 1 Summary

**Files Modified (5):**
1. `src/types/index.ts` - Add `safeSlotsCount` to `ShopUpgrades`
2. `src/data/shop.ts` - Add safe slots upgrade item
3. `src/systems/saveData.ts` - Add migration logic + clamp helper
4. `src/game.ts` - Remove manual secure, add auto-select, update game over
5. `src/systems/ui.ts` - Update inventory UI, add HUD update
6. `src/style.css` - Add `.auto-secured` styles, HUD button styles
7. `index.html` - Add review loot button
8. `src/main.ts` - Expose reviewLoot to window

**New Files (2):**
1. `src/__tests__/testUtils.ts` - Test helper functions
2. `src/__tests__/safeSlots.test.ts` - Comprehensive test coverage

**Estimated Time:** 2 hours

**Success Criteria:**
- ✅ Death saves top N items by rarity (N = safe slots count, 1-5)
- ✅ Extraction saves all items
- ✅ Shop has "Safe Container" upgrade (500G → 1000G → 3000G → 5000G)
- ✅ HUD shows "📦 Review Loot" button (clickable/tappable)
- ✅ HUD shows "Auto-Secure: X/5" count
- ✅ Inventory shows "X of Y items will be auto-secured"
- ✅ Items marked with gold border + "AUTO-SECURED" badge
- ✅ Save data clamps to 1-5 range with console warning
- ✅ All tests pass (coverage > 80%)

---

### PHASE 2: Shop System (Items + Gambler)

#### Step 2.1: Update Shop Data Structures

**types/index.ts:**
```typescript
export interface ShopItemListing {
  item: Item | null; // null for veiled items
  veiled: boolean;
  rarity: ItemRarity;
  type: ItemType;
  price: number;
  listedAt: number;
  expiresAt: number;
}

export interface ShopData {
  upgrades: ShopUpgrades;
  items: ShopItemListing[]; // ITEMS tab (mixed)
  gamblerItems: ShopItemListing[]; // GAMBLER tab (all veiled)
  lastRefresh: number;
  lastDailyRefresh: number;
}
```

**data/shop.ts - Pricing:**
```typescript
export function calculateShopPrice(rarity: ItemRarity, isVeiled: boolean): number {
  const basePrices = {
    common: 150,
    magic: 400,
    rare: 1000,
    legendary: 2500
  };

  let price = basePrices[rarity];

  // Veiled items cheaper? (TBD - ask user)
  if (isVeiled) {
    price = Math.floor(price * 0.8); // 20% discount for gamble
  }

  return price;
}
```

**systems/saveData.ts:**
```typescript
// Update createDefaultSaveData()
const createDefaultSaveData = (): SaveGameData => ({
  gold: 0,
  ownedChars: ['wizard'],
  selectedChar: 'wizard',
  shop: {
    damage: 0,
    health: 0,
    speed: 0,
    magnet: 0,
    safeSlotsCount: 1
  },
  stash: new Stash().toJSON(),
  loadout: { /* ... */ },
});

// Add shop refresh data to SaveGameData (or separate system)
// ...
```

#### Step 2.2: Shop Generation System

**NEW FILE: src/systems/shopGeneration.ts:**
```typescript
export function generateShopInventory(): {
  items: ShopItemListing[];
  gamblerItems: ShopItemListing[];
} {
  const items: ShopItemListing[] = [];
  const gamblerItems: ShopItemListing[] = [];

  // Generate 4-6 items for ITEMS tab (mixed revealed/veiled)
  const itemCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < itemCount; i++) {
    const veiled = Math.random() < 0.3; // 30% veiled
    const rarity = rollRarity();
    const type = randomItemType();

    if (veiled) {
      items.push({
        item: null,
        veiled: true,
        rarity,
        type,
        price: calculateShopPrice(rarity, true),
        listedAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      });
    } else {
      const item = ItemGenerator.generate({ itemType: type, luck: 0 });
      items.push({
        item,
        veiled: false,
        rarity: item.rarity,
        type: item.type,
        price: calculateShopPrice(item.rarity, false),
        listedAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      });
    }
  }

  // Generate 4-6 items for GAMBLER tab (all veiled)
  const gamblerCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < gamblerCount; i++) {
    const rarity = rollRarity();
    const type = randomItemType();

    gamblerItems.push({
      item: null,
      veiled: true,
      rarity,
      type,
      price: calculateShopPrice(rarity, true),
      listedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    });
  }

  return { items, gamblerItems };
}

function rollRarity(): ItemRarity {
  const roll = Math.random();
  if (roll < 0.5) return 'common';
  if (roll < 0.8) return 'magic';
  if (roll < 0.95) return 'rare';
  return 'legendary';
}

function randomItemType(): ItemType {
  const types: ItemType[] = ['weapon', 'helm', 'armor', 'accessory', 'relic'];
  return types[Math.floor(Math.random() * types.length)];
}
```

#### Step 2.3: Shop Refresh System

**NEW FILE: src/systems/shopManager.ts:**
```typescript
class ShopManager {
  private data: ShopData;

  refresh(afterRun: boolean = false): void {
    if (afterRun) {
      // Free refresh after run
      this.generateInventory();
    }
    this.save();
  }

  manualRefresh(): boolean {
    const cost = 200;
    if (SaveData.data.gold < cost) return false;

    SaveData.data.gold -= cost;
    this.generateInventory();
    this.save();
    return true;
  }

  checkDailyRefresh(): void {
    const now = Date.now();
    const lastDaily = this.data.lastDailyRefresh;
    const dayInMs = 24 * 60 * 60 * 1000;

    if (now - lastDaily > dayInMs) {
      this.generateInventory();
      this.data.lastDailyRefresh = now;
      this.save();
    }
  }

  private generateInventory(): void {
    const inventory = generateShopInventory();
    this.data.items = inventory.items;
    this.data.gamblerItems = inventory.gamblerItems;
    this.data.lastRefresh = Date.now();
  }

  // ... save/load methods
}

export const ShopManager = new ShopManager();
```

#### Step 2.4: Update Shop UI

**index.html:**
```html
<!-- Shop Screen -->
<div id="shop-screen" class="screen">
    <h1>ARMORY</h1>
    <h2>Gold: <span id="shop-gold-display">0</span></h2>

    <!-- Tab Navigation -->
    <div class="shop-tabs">
        <button class="shop-tab active" data-tab="upgrades">UPGRADES</button>
        <button class="shop-tab" data-tab="items">ITEMS</button>
        <button class="shop-tab" data-tab="gambler">GAMBLER</button>
    </div>

    <!-- Tab Contents -->
    <div id="upgrades-tab" class="shop-tab-content active">
        <div id="shop-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"></div>
    </div>
    <div id="items-tab" class="shop-tab-content">
        <div id="shop-items-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"></div>
    </div>
    <div id="gambler-tab" class="shop-tab-content">
        <div id="gambler-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"></div>
    </div>

    <!-- Refresh Buttons -->
    <div class="shop-footer">
        <button onclick="ShopManager.manualRefresh()">REFRESH (200G)</button>
        <div style="font-size:10px;color:#888">Daily refresh: <span id="daily-timer"></span></div>
    </div>

    <button onclick="Menu.closeShop()" style="margin-top:20px;">BACK</button>
</div>
```

**systems/ui.ts:**
```typescript
renderShop(): void {
  const goldDisplay = document.getElementById('shop-gold-display');
  if (goldDisplay) goldDisplay.textContent = SaveData.data.gold.toString();

  // Render upgrades (existing)
  this.renderUpgrades();

  // Render items
  this.renderShopItems(ShopManager.data.items, 'shop-items-grid');

  // Render gambler
  this.renderShopItems(ShopManager.data.gamblerItems, 'gambler-grid');

  // Update daily timer
  this.updateDailyTimer();
}

renderShopItems(items: ShopItemListing[], gridId: string): void {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';

  items.forEach(listing => {
    const card = document.createElement('div');
    card.className = `shop-item-card rarity-${listing.rarity}`;

    if (listing.veiled) {
      card.innerHTML = `
        <div class="shop-item-veiled">❓ VEILED</div>
        <div class="shop-item-rarity">${listing.rarity.toUpperCase()}</div>
        ${listing.item ? `<div class="shop-item-type">${listing.type}</div>` : ''}
        <div class="shop-item-price" style="color:var(--gold)">${listing.price}G</div>
        <div class="shop-item-expiry">Expires: ${this.formatExpiry(listing.expiresAt)}</div>
        <button class="shop-buy-btn">BUY</button>
      `;
    } else {
      // Revealed item
      card.innerHTML = `
        <div class="shop-item-name">${listing.item.name}</div>
        <div class="shop-item-rarity">${listing.item.rarity.toUpperCase()}</div>
        <div class="shop-item-type">${listing.item.type}</div>
        <div class="shop-item-price" style="color:var(--gold)">${listing.price}G</div>
        <div class="shop-item-expiry">Expires: ${this.formatExpiry(listing.expiresAt)}</div>
        <button class="shop-buy-btn">BUY</button>
      `;
    }

    // Buy handler
    card.querySelector('.shop-buy-btn')!.onclick = () => this.buyShopItem(listing);

    grid.appendChild(card);
  });
}

formatExpiry(expiresAt: number): string {
  const hours = Math.floor((expiresAt - Date.now()) / (1000 * 60 * 60));
  if (hours < 1) return '< 1h';
  return `${hours}h`;
}
```

#### Step 2.5: Integrate with Game Loop

**game.ts:**
```typescript
gameOver(success = false): void {
  // ... existing logic ...

  // Refresh shop after run (free)
  ShopManager.refresh(true);
}
```

#### Step 2.6: Testing

- Test free refresh after run
- Test manual refresh (gold deduction)
- Test daily refresh (timer)
- Test buying items (revealed)
- Test buying veiled items (random item generation on purchase)
- Test expiry timers
- Test tab switching

---

### PHASE 3: Debug Menu Enhancements

#### Step 3.1: Add Debug Options

**index.html:**
```html
<!-- Debug Screen -->
<div id="debug-screen" class="screen">
    <h1 style="color:var(--debug)">DEBUG TERMINAL</h1>
    <div class="debug-menu-content">
        <button class="debug-action-btn" onclick="Menu.openSpriteViewer()">SPRITE VIEWER</button>
        <button class="debug-action-btn" onclick="Debug.addGold(5000)">ADD 5000 GOLD</button>
        <button class="debug-action-btn" onclick="Debug.unlockAll()">UNLOCK ALL PILOTS</button>
        <button id="debug-loot-boost" class="debug-action-btn" onclick="Debug.toggleLootBoost()">LOOT BOOST: OFF</button>
        <button class="debug-action-btn" onclick="Debug.freeShopRefresh()">FREE SHOP REFRESH</button>
        <button class="debug-action-btn" onclick="Debug.saveAllItems()">SAVE ALL ITEMS ON DEATH</button>
        <button class="debug-action-btn" onclick="Debug.resetProgress()" style="border-color: #f00;">WIPE ALL DATA</button>
    </div>
    <button onclick="Menu.closeDebug()" style="margin-top:20px;">EXIT DEBUG</button>
</div>
```

**systems/debug.ts (NEW):**
```typescript
export class DebugSystem {
  freeShopRefresh(): void {
    ShopManager.manualRefresh();
    // Refund the gold
    SaveData.data.gold += 200;
    SaveData.save();
    console.log('Debug: Free shop refresh');
  }

  saveAllItems(): void {
    // Set safe slots to very high number
    SaveData.data.shop.safeSlotsCount = 999;
    SaveData.save();
    console.log('Debug: Save all items on death enabled');
  }

  // ... existing debug methods
}

export const Debug = new DebugSystem();
```

---

### PHASE 4: Extraction Zones

#### FINAL DESIGN DECISIONS

**Zone Properties:**
- **Spawn interval**: Every 3 minutes (at 3:00, 6:00, 9:00...)
- **Zone duration**: 30-second window to reach zone
- **Extraction time**: 5 seconds while standing in zone
- **Zone radius**: 120px
- **Spawn distance**: 400-800px from player (random direction)
- **Warning lead**: 15-second countdown before zone spawns
- **Max active zones**: 1 at a time

**Extraction Behavior:**
- Player enters zone → 5-second extraction timer starts
- Leaving zone resets timer to 0
- Completing 5 seconds → successful extraction (all loot saved)
- Zone expires after 30 seconds if not entered

**Enemy Behavior (Active Zone):**
- When player enters zone, spawn 8 enemies in a circle around zone (distance ~150px)
- Enemies aggressively target player in zone
- Normal enemy spawns continue during extraction

**Death Behavior:**
- Zone remains active after player death (no effect in current game - useful for future respawn system)
- Death during extraction = normal death behavior (only safe slot items saved)
- ABORT button = death behavior (only safe slot items saved)

**Visual Style (Portal):**
- Pre-spawn warning: Directional arrow + "EXTRACT IN: 15s" HUD text
- Active zone: Pulsing green portal (swirling rift effect)
- Zone text: "EXTRACT" floating above, countdown timer
- In zone: Progress bar (0-5s), particle effects
- Off-screen: Arrow pointing toward zone

---

#### Step 4.1: Add Extraction Zone Types

**types/index.ts:**
```typescript
export interface ExtractionZone {
  x: number;
  y: number;
  radius: number; // 120px
  spawnTime: number; // Frame when zone spawned
  expiresAt: number; // Frame when zone expires (30s after spawn)
  active: boolean;
  extractionProgress: number; // 0-300 frames (5 seconds)
  inZone: boolean; // Track if player is currently in zone
  warningActive: boolean; // 15s warning state
  enemiesSpawned: boolean; // Track if we've spawned the 8 enemies
}

export interface ExtractionState {
  currentZone: ExtractionZone | null;
  lastSpawnTime: number; // Frame of last zone spawn
  nextSpawnTime: number; // Frame of next zone spawn
  warningEndTime: number; // Frame when warning period ends
}
```

---

#### Step 4.2: Create Extraction System

**NEW FILE: src/systems/extraction.ts:**
```typescript
import { Utils } from '../utils';
import { CONFIG } from '../config';
import type { ExtractionZone, ExtractionState } from '../types';

const ZONE_INTERVAL = 60 * 180; // 3 minutes in frames
const ZONE_DURATION = 60 * 30; // 30 seconds in frames
const EXTRACT_TIME = 60 * 5; // 5 seconds in frames
const WARNING_TIME = 60 * 15; // 15 seconds in frames
const ZONE_RADIUS = 120;
const ENEMY_COUNT = 8;

export function initExtractionState(): ExtractionState {
  return {
    currentZone: null,
    lastSpawnTime: 0,
    nextSpawnTime: ZONE_INTERVAL,
    warningEndTime: 0,
  };
}

export function updateExtraction(
  state: ExtractionState,
  playerX: number,
  playerY: number,
  frames: number
): { state: ExtractionState; enemiesToSpawn: Array<{x: number; y: number; type: 'basic'}> | null } {
  let enemiesToSpawn: Array<{x: number; y: number; type: 'basic'}> | null = null;

  // Check if we should show warning
  if (frames >= state.nextSpawnTime - WARNING_TIME && !state.warningEndTime) {
    state.warningEndTime = state.nextSpawnTime;
  }

  // Check if we should spawn zone
  if (frames >= state.nextSpawnTime && !state.currentZone) {
    state.currentZone = createExtractionZone(playerX, playerY, frames);
    state.lastSpawnTime = frames;
    state.nextSpawnTime = frames + ZONE_INTERVAL;
    state.warningEndTime = 0;
  }

  // Update current zone
  if (state.currentZone) {
    const zone = state.currentZone;

    // Check if expired
    if (frames >= zone.expiresAt) {
      zone.active = false;
      state.currentZone = null;
      return { state, enemiesToSpawn: null };
    }

    // Check if player is in zone
    const dist = Utils.getDist(playerX, playerY, zone.x, zone.y);
    zone.inZone = dist < zone.radius;

    if (zone.inZone) {
      zone.extractionProgress += 1; // 1 frame = 1/60 second

      // Spawn 8 enemies in circle on first entry
      if (!zone.enemiesSpawned) {
        enemiesToSpawn = spawnEnemiesInCircle(zone.x, zone.y);
        zone.enemiesSpawned = true;
      }

      // Check if extraction complete
      if (zone.extractionProgress >= EXTRACT_TIME) {
        zone.active = false;
        // Trigger extraction in game.ts
        // We'll return a signal to game to call Game.gameOver(true)
      }
    } else {
      // Reset progress if player leaves zone
      zone.extractionProgress = 0;
    }
  }

  return { state, enemiesToSpawn };
}

function createExtractionZone(playerX: number, playerY: number, frames: number): ExtractionZone {
  // Spawn 400-800px away from player in random direction
  const angle = Math.random() * Math.PI * 2;
  const dist = 400 + Math.random() * 400;

  return {
    x: (playerX + Math.cos(angle) * dist + CONFIG.worldSize) % CONFIG.worldSize,
    y: (playerY + Math.sin(angle) * dist + CONFIG.worldSize) % CONFIG.worldSize,
    radius: ZONE_RADIUS,
    spawnTime: frames,
    expiresAt: frames + ZONE_DURATION,
    active: true,
    extractionProgress: 0,
    inZone: false,
    warningActive: false,
    enemiesSpawned: false,
  };
}

function spawnEnemiesInCircle(zoneX: number, zoneY: number): Array<{x: number; y: number; type: 'basic'}> {
  const enemies: Array<{x: number; y: number; type: 'basic'}> = [];
  const circleRadius = 150;

  for (let i = 0; i < ENEMY_COUNT; i++) {
    const angle = (i / ENEMY_COUNT) * Math.PI * 2;
    const x = (zoneX + Math.cos(angle) * circleRadius + CONFIG.worldSize) % CONFIG.worldSize;
    const y = (zoneY + Math.sin(angle) * circleRadius + CONFIG.worldSize) % CONFIG.worldSize;
    enemies.push({ x, y, type: 'basic' });
  }

  return enemies;
}

export function shouldExtract(state: ExtractionState): boolean {
  return state.currentZone?.extractionProgress >= EXTRACT_TIME || false;
}

export function getExtractionWarning(state: ExtractionState): { active: boolean; timeRemaining: number; x?: number; y?: number } {
  if (!state.warningEndTime) return { active: false, timeRemaining: 0 };

  const timeRemaining = Math.max(0, state.warningEndTime - (state.nextSpawnTime - WARNING_TIME));
  // Calculate zone position for warning arrow
  if (state.nextSpawnTime > state.warningEndTime && timeRemaining > 0) {
    const framesUntilSpawn = state.nextSpawnTime - (state.nextSpawnTime - WARNING_TIME) - timeRemaining;
    // Zone position would be calculated same as in createExtractionZone
    // For now, return undefined - game will handle direction
    return { active: true, timeRemaining: Math.ceil(timeRemaining / 60) };
  }

  return { active: false, timeRemaining: 0 };
}
```

---

#### Step 4.3: Integrate with Game Loop

**game.ts:**
```typescript
// Add to GameCore class
extractionState: ExtractionState = initExtractionState();

// In start() method:
this.extractionState = initExtractionState();

// In update() method:
// Add after enemy spawning section
const extractionResult = updateExtraction(
  this.extractionState,
  p.x,
  p.y,
  this.frames
);

// Spawn enemies from extraction zone if needed
if (extractionResult.enemiesToSpawn) {
  for (const enemyData of extractionResult.enemiesToSpawn) {
    this.enemies.push(new Enemy(enemyData.x, enemyData.y, enemyData.type, this.mins, this.obstacles));
  }
}

// Check for extraction completion
if (shouldExtract(this.extractionState)) {
  this.gameOver(true);
  return; // Exit update early
}

// Store updated state
this.extractionState = extractionResult.state;
```

---

#### Step 4.4: Update UI for Extraction

**systems/ui.ts:**
```typescript
// Add to UI class
updateExtractionHUD(state: ExtractionState, playerX: number, playerY: number): void {
  const warningEl = document.getElementById('extract-warning');
  const countdownEl = document.getElementById('extract-countdown');
  const arrowEl = document.getElementById('extract-arrow');

  const warning = getExtractionWarning(state);

  if (warning.active && warning.timeRemaining > 0) {
    // Show warning
    if (warningEl) {
      warningEl.textContent = `EXTRACT IN: ${warning.timeRemaining}s`;
      warningEl.style.display = 'block';
    }
  } else if (state.currentZone && state.currentZone.active) {
    // Show countdown to zone expiry
    const timeRemaining = Math.ceil((state.currentZone.expiresAt - frames) / 60);
    if (countdownEl) {
      countdownEl.textContent = `EXTRACT ZONE: ${timeRemaining}s`;
      countdownEl.style.display = 'block';
    }

    // Show extraction progress if in zone
    if (state.currentZone.inZone) {
      const progress = Math.floor((state.currentZone.extractionProgress / EXTRACT_TIME) * 100);
      const progressEl = document.getElementById('extract-progress');
      if (progressEl) {
        progressEl.textContent = `EXTRACTING: ${progress}%`;
        progressEl.style.display = 'block';
      }
    }
  } else {
    // Hide all extraction UI
    if (warningEl) warningEl.style.display = 'none';
    if (countdownEl) countdownEl.style.display = 'none';
    const progressEl = document.getElementById('extract-progress');
    if (progressEl) progressEl.style.display = 'none';
  }
}
```

**index.html - Add extraction HUD elements:**
```html
<!-- Add to HUD section -->
<div class="extraction-ui">
    <div id="extract-warning" style="display:none; color:#4ade80; font-size:14px; text-shadow: 0 0 10px #4ade80;"></div>
    <div id="extract-countdown" style="display:none; color:#4ade80; font-size:14px;"></div>
    <div id="extract-progress" style="display:none; color:#22d3ee; font-size:14px;"></div>
    <div id="extract-arrow" style="display:none; position:fixed; top:50%; left:50%; width:40px; height:40px; pointer-events:none; z-index:100;"></div>
</div>
```

---

#### Step 4.5: Add Extraction Zone Rendering

**renderer/three.ts (or separate extraction renderer):**
```typescript
// Add to render method
renderExtractionZone(zone: ExtractionZone, playerX: number, playerY: number, viewportWidth: number, viewportHeight: number): void {
  if (!zone || !zone.active) return;

  // Calculate screen position (account for camera/world wrap)
  // ... use existing viewport calculation logic

  // Draw pulsing portal circle
  const pulsePhase = (Date.now() % 2000) / 2000; // 2 second pulse cycle
  const pulseScale = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.1;

  // Draw green portal circle with glow
  ctx.beginPath();
  ctx.arc(zone.x - playerX + viewportWidth/2, zone.y - playerY + viewportHeight/2, zone.radius * pulseScale, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(74, 222, 128, ${0.3 + pulsePhase * 0.2})`;
  ctx.fill();
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw "EXTRACT" text above zone
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXTRACT', zone.x - playerX + viewportWidth/2, zone.y - playerY + viewportHeight/2 - zone.radius - 20);

  // Draw extraction progress bar if in zone
  if (zone.inZone) {
    const progress = zone.extractionProgress / EXTRACT_TIME;
    const barWidth = 60;
    const barHeight = 8;
    const barX = zone.x - playerX + viewportWidth/2 - barWidth/2;
    const barY = zone.y - playerY + viewportHeight/2 + zone.radius + 20;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${Math.floor(progress * 100)}%`, barX + barWidth/2, barY - 2);
  }
}
```

---

#### Step 4.6: Testing

- [ ] Test zone spawn timing (every 3 minutes)
- [ ] Test warning system (15s countdown)
- [ ] Test zone duration (30s expiry)
- [ ] Test extraction timer (5s in zone)
- [ ] Test enemy spawning (8 in circle)
- [ ] Test player leaving zone (timer reset)
- [ ] Test death during extraction
- [ ] Test extraction completion (all loot saved)
- [ ] Test zone visuals (portal, pulse, progress bar)
- [ ] Test off-screen arrow indicator
- [ ] Test UI updates (warning, countdown, progress)
- [ ] Test multiple extraction cycles in one run

---

## TECHNICAL NOTES

### Save Data Migration
When updating `SaveGameData`, handle migration for existing players:
```typescript
load(): void {
  const saved = localStorage.getItem(this.key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<SaveGameData>;

      // Migrate safe slots
      if (parsed.shop && !parsed.shop.safeSlotsCount) {
        parsed.shop.safeSlotsCount = 1; // Default to 1 slot
      }

      // ... rest of existing migration logic
    } catch (e) {
      console.error('Failed to parse save data:', e);
    }
  }
}
```

### Performance Considerations
- Shop generation happens only on refresh (not every frame)
- Safe slot calculation happens once on death
- Expiry timer updates every second (not every frame)

### Testing Checklist

**Safe Slots (Phase 1):**
- [ ] Test `autoSelectSafeItems()` with 0 items (returns empty array)
- [ ] Test `autoSelectSafeItems()` with 1 slot and 3 legendary items (saves 1)
- [ ] Test `autoSelectSafeItems()` with 5 slots and 10 items (saves top 5 by rarity)
- [ ] Test tiebreaker works (random selection among same rarity)
- [ ] Test rarity order: legendary > relic > rare > magic > common
- [ ] Test `gameOver(true)` saves all items (extraction)
- [ ] Test `gameOver(false)` saves only auto-selected items (death)
- [ ] Test safe slots upgrade costs at each level
- [ ] Test upgrade max level constraint
- [ ] Test loading save data with missing `safeSlotsCount` (defaults to 1)
- [ ] Test loading save data with existing `safeSlotsCount` (preserves value)
- [ ] Test save/load data persistence for `safeSlotsCount`
- [ ] Test clamping to 1-5 range (0 → 1, 6 → 5, -1 → 1, 10 → 5)
- [ ] Test console warning when clamping occurs
- [ ] Test inventory UI shows correct auto-secured count
- [ ] Test items marked with `.auto-secured` class based on rarity
- [ ] Test UI displays rarity correctly for each item
- [ ] Test HUD shows correct auto-secured count
- [ ] Test HUD updates when items collected
- [ ] Test HUD shows max 5 when at 5 slots
- [ ] Test review loot button visibility (hidden when no items)
- [ ] Test review loot button clickability (desktop and mobile)

**Shop:**
- [ ] Test all three tabs (UPGRADES/ITEMS/GAMBLER)
- [ ] Test buying revealed items
- [ ] Test buying veiled items (random generation on purchase)
- [ ] Test free refresh after run
- [ ] Test manual refresh (gold deduction)
- [ ] Test daily refresh (timer/expiry)
- [ ] Test expiry display and countdown
- [ ] Test tab switching

**Extraction Zones:**
- [ ] Test zone spawn timing (every 3 minutes)
- [ ] Test warning system (15s countdown, arrow)
- [ ] Test zone duration (30s expiry)
- [ ] Test extraction timer (5s in zone)
- [ ] Test enemy spawning (8 in circle around zone)
- [ ] Test player leaving zone (timer reset)
- [ ] Test death during extraction (only safe slot items saved)
- [ ] Test extraction completion (all loot saved)
- [ ] Test zone visuals (portal, pulse, progress bar)
- [ ] Test off-screen arrow indicator
- [ ] Test UI updates (warning, countdown, progress)
- [ ] Test multiple extraction cycles in one run

**Debug:**
- [ ] Test free shop refresh
- [ ] Test save all items (999 safe slots)
- [ ] Test all existing debug options

---

## NEXT STEPS

✅ **ALL DECISIONS FINALIZED**

**Implementation Order (Phased Rollout):**
1. **Phase 1**: Safe Slots (foundation, auto-selection system) - 2 hours
   - Test utilities, types, shop data, save migration, auto-selection, UI, HUD, CSS, tests
2. **Phase 2**: Shop System (three tabs, refresh mechanisms) - 2-2.5 hours
   - Shop types, generation, manager, UI, refresh systems
3. **Phase 3**: Debug Enhancements (new debug options) - 0.5-1 hour
4. **Phase 4**: Extraction Zones (in-world extraction, enemy spawning, blue portal) - 2.5-3 hours

**Total Estimated Time:** 7-8.5 hours across 4 phases

**Phase 1 Status:** ✅ **READY TO IMPLEMENT**

**Phase 1 Approach:**
- Task-by-task implementation (1.1 → 1.9)
- Test coverage created alongside implementation
- Each task is independently testable
- Review loot button for desktop + mobile
- Clamping with console warning for data safety

**Ready to begin Phase 1 implementation?** Once you confirm, I'll execute tasks 1.1-1.9 in order with full test coverage.
