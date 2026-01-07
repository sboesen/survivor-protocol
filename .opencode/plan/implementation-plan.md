# Safe Slots & Extraction System - IMPLEMENTATION PLAN

## USER DECISIONS (CONFIRMED)

### Safe Slots
✅ **Automatic system** - No player choice, automatically preserves top N rare items
✅ **Priority logic** - Top N based on rarity, random selection among ties
✅ **No manual replacement** - Cannot replace items when full
✅ **Cap at 5 slots** (not 3)
✅ **Tutorial/menu explanation** - Explain mechanic in menus or in-game

### Item Shop
✅ **Three tabs:**
   - "UPGRADES" - Stat upgrades (existing)
   - "ITEMS" - Mixed (some revealed, some veiled)
   - "GAMBLER" - Veiled items only
✅ **Rarity always visible** in all tabs
✅ **Three refresh systems:**
   - Free refresh after each run
   - Manual refresh (costs gold)
   - Daily refresh (real-time, 24h expiry)
✅ **Expiry timers** shown for all items

### Debug Menu
✅ **Add to existing debug screen:**
   - Free shop refresh
   - Save all items (bypass safe slot limit)
   - Other useful debugging options

---

## OPEN QUESTIONS

### Safe Slots Logic
1. **Tiebreaker priority**: When multiple items have same rarity, how to choose?
   - Option A: Relics > Regular items > Weapon/Helm/Armor/Accessory
   - Option B: Pure random among same-rarity items
   - Option C: Consider item tier (higher tier > lower tier)

2. **Inventory display**: In [I] inventory, should we:
   - Show which N items are currently secured?
   - Show "X items auto-secured" without highlighting?
   - Show nothing until run ends?

### Shop Structure
1. **Gambler tab**: For veiled items, what should be visible?
   - Option A: Only price and "VEILED ITEM" (total mystery)
   - Option B: Price + type (e.g., "VEILED WEAPON - 500G")
   - Option C: Price + type + rarity (e.g., "VEILED RARE WEAPON - 800G")

2. **Tab item distribution**: How many items per tab?
   - ITEMS tab: 3-5 items (mixed revealed/veiled)
   - GAMBLER tab: 3-5 items (all veiled)
   - Or different distribution?

3. **Pricing for gambler items**: Should veiled items cost:
   - Same as if revealed (fair price for mystery)
   - Discounted (cheaper because it's a gamble)
   - Premium (more expensive for chance at good item)

### Extraction Zones
1. **Zone behavior on death**: Should zone:
   - Disappear when player dies
   - Remain active (though extraction would end death)

2. **Enemy spawning**: Should zone:
   - Spawn extra enemies nearby (make extraction harder)
   - Just rely on existing spawn system

3. **Multiple zones**: Should we allow:
   - One zone at a time only
   - Multiple zones simultaneously

4. **Warning system**: Should we add:
   - 30-second countdown before zone spawns
   - Just instant spawn with 30-second window to reach

---

## IMPLEMENTATION PLAN

### PHASE 1: Safe Slots Auto-System

#### Step 1.1: Update Data Structures

**types/index.ts:**
```typescript
export interface SaveGameData {
  gold: number;
  ownedChars: string[];
  selectedChar: string;
  shop: ShopUpgrades;
  stash: Array<Item | null>;
  loadout: LoadoutData;
  safeSlotsCount: number; // CHANGED: 1-5, tracks unlocked slots
}

export interface ShopUpgrades {
  damage: number;
  health: number;
  speed: number;
  magnet: number;
  safeSlotsCount: number; // NEW: Track safe slot upgrades
}
```

**data/shop.ts:**
```typescript
export const SHOP_ITEMS: Record<string, ShopItem> = {
  damage: { name: "Might", desc: "+10% Dmg", cost: (l) => 100 * (l + 1), max: 5 },
  health: { name: "Vitality", desc: "+20 HP", cost: (l) => 80 * (l + 1), max: 5 },
  speed: { name: "Haste", desc: "+5% Spd", cost: (l) => 150 * (l + 1), max: 3 },
  magnet: { name: "Magnet", desc: "+20% Rng", cost: (l) => 100 * (l + 1), max: 3 },
  safeSlots: {
    name: "Safe Container",
    desc: "+1 Auto-Safe Slot",
    cost: (l) => l === 1 ? 500 : (l === 2 ? 1000 : l * 1000), // 500, 1000, 2000, 4000
    max: 5 // Total slots
  }
};
```

**game.ts:**
```typescript
// Remove: securedLootId: string | null = null;
// Remove: securedLootIds: string[] = [];

// Add method for auto-selection
private autoSelectSafeItems(): string[] {
  if (this.collectedLoot.length === 0) return [];

  const safeSlotCount = SaveData.data.shop.safeSlotsCount;
  const rarityOrder = { 'legendary': 4, 'relic': 3, 'rare': 2, 'magic': 1, 'common': 0 };

  // Sort by rarity (desc), then random within same rarity
  const sorted = [...this.collectedLoot].sort((a, b) => {
    const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
    if (rarityDiff !== 0) return rarityDiff;

    // Tiebreaker: random (or user preference TBC)
    return Math.random() - 0.5;
  });

  // Return top N item IDs
  return sorted.slice(0, safeSlotCount).map(item => item.id);
}

// Update gameOver()
gameOver(success = false): void {
  this.active = false;
  this.lootInventoryOpen = false;
  UI.hideLootInventory();

  const rewards = calculateGameOverRewards({...});

  const stash = Stash.fromJSON(SaveData.data.stash);

  // Use auto-selection instead of manual
  const securedIds = success
    ? this.collectedLoot.map(item => item.id)
    : this.autoSelectSafeItems();

  const itemsToStore = this.collectedLoot.filter(item => securedIds.includes(item.id));
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

#### Step 1.2: Update UI

**systems/ui.ts - Remove manual secure UI:**
- Remove `showLootInventory()` method (or repurpose)
- Update inventory to show "X items will be auto-secured" message
- Add safe slot count display

**systems/ui.ts - Add shop slot display:**
```typescript
// In renderShop():
const safeSlotLevel = SaveData.data.shop.safeSlotsCount;
// Display as: "Safe Container X/5 slots"
```

**index.html - Update HUD:**
- Change "Secured: None" to show auto-secured count
- Add safe slot total indicator

#### Step 1.3: Add Tutorial/Explanation

**Add help screen or menu text:**
```
AUTO-SAFE SLOTS:
When you die, your X best items are automatically saved to stash.
Upgrade to save more items on death!

Priority: Legendary > Relic > Rare > Magic > Common
Same rarity: Random selection
```

#### Step 1.4: Testing

- Test with 1-5 slots at various loot levels
- Verify tiebreaker logic
- Test extraction (all items saved)
- Test death (top N items saved)
- Save/load data persistence

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

### PHASE 4: Extraction Zones (IF NEEDED)

*NOTE: User hasn't confirmed extraction zone decisions yet. Implementation pending.*

#### Questions to Answer:
1. Zone behavior on death?
2. Enemy spawning during extraction?
3. Multiple zones?
4. Warning system?

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
- [ ] Safe slots: Test with 1-5 slots
- [ ] Safe slots: Test extraction vs death
- [ ] Safe slots: Test tiebreaker logic
- [ ] Shop: Test all three tabs
- [ ] Shop: Test buying revealed items
- [ ] Shop: Test buying veiled items
- [ ] Shop: Test all refresh types
- [ ] Shop: Test expiry display
- [ ] Debug: Test all debug options
- [ ] Save/load: Test data persistence

---

## NEXT STEPS

1. **Answer open questions** (tiebreaker logic, shop details, extraction zones)
2. **Confirm implementation order** (Safe slots first, then shop, then extraction?)
3. **Begin Phase 1** implementation when ready
