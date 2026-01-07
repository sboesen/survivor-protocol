# Safe Slots & Extraction System Plan

## Overview
Add Tarkov-style safe slots and in-world extraction zones to enhance the risk/reward loot mechanics.

---

## Current State Analysis

### Existing Systems
- **Loot Collection**: Veiled items drop from enemies during runs
- **Extraction**: Currently via "ABORT" button → extraction screen shows all collected loot
- **Loot Persistence**: All loot saved on extraction, only 1 secured item on death
- **Reveal System**: Items revealed between runs with slot-machine reveal animation
- **Stash**: Permanent storage between runs, 7-slot loadout system
- **Shop**: Currently only stat upgrades (Might, Vitality, Haste, Magnet) - no items

### Current Code Locations
- `src/game.ts:100` - `securedLootId` single slot
- `src/game.ts:376-381` - `secureLoot()` method
- `src/game.ts:383-413` - `gameOver()` handles loot persistence
- `src/systems/ui.ts:433-489` - Loot inventory UI
- `src/systems/ui.ts:182-424` - Extraction screen UI
- `src/data/shop.ts` - Shop items (stat upgrades only)

---

## System 1: Tarkov-Style Safe Slots

### Design Goals
- Reduce frustration of losing good loot
- Create permanent progression path
- Add meaningful item management decisions
- Maintain risk/reward tension

### Proposed Implementation

#### Safe Slot Properties
- **Slots Array**: Replace single `securedLootId` with `securedLootIds: string[]`
- **Slot Count**: 1-3 slots total
- **Acquisition**: Shop upgrade (like stat upgrades)
- **Cost Structure**:
  - Base: 1 slot (free, already exists)
  - Slot 2: 500G
  - Slot 3: 1,500G
- **Availability**: Shop item named "Secure Case" or "Safe Container"

#### Slot Rules
- **Changeable Mid-Run**: Players can change secured loot anytime via [I] inventory
- **Visual Distinction**: Safe slots clearly marked in UI
- **Persistence**: Safe slot configuration saved per player (not per run)

#### UI Changes
1. **Inventory Screen** (`loot-inventory-screen`):
   - Show all safe slots at top (1-3 slots)
   - Each slot shows secured item or "EMPTY"
   - Clicking an item moves it to next available safe slot
   - Visual indicator for which items are secured

2. **Shop Screen** (`shop-screen`):
   - Add "Safe Container" upgrade item
   - Display current/next slot count (e.g., "Safe Container 1/3")
   - Show cost for next upgrade or "MAX" when at 3 slots

3. **HUD**:
   - Add indicator showing "Secured: X/Y" where Y = total safe slots

#### Data Structure Changes

**SaveGameData** (types/index.ts):
```typescript
export interface SaveGameData {
  gold: number;
  ownedChars: string[];
  selectedChar: string;
  shop: ShopUpgrades;
  stash: Array<Item | null>;
  loadout: LoadoutData;
  safeSlots: number; // NEW: 1-3
}
```

**ShopItems** (data/shop.ts):
```typescript
export const SHOP_ITEMS: Record<string, ShopItem> = {
  // ... existing
  safeSlots: {
    name: "Safe Container",
    desc: "+1 Safe Slot",
    cost: (l) => l === 1 ? 500 : 1500, // 2nd slot: 500G, 3rd slot: 1500G
    max: 3 // Total slots, not upgrades
  }
};
```

**GameCore** (game.ts):
```typescript
securedLootIds: string[] = []; // Array instead of single id
safeSlotsAvailable: number = 1; // From SaveData

secureLoot(itemId: string): void {
  // Remove from any existing slot
  this.securedLootIds = this.securedLootIds.filter(id => id !== itemId);

  // Add to first available slot
  if (this.securedLootIds.length < this.safeSlotsAvailable) {
    this.securedLootIds.push(itemId);
  } else {
    // Replace oldest if full (or prevent - TBC)
  }
}
```

---

## System 2: In-World Extraction Zones

### Design Goals
- Create spatial extraction objectives
- Add tactical decision-making (push for loot vs extract early)
- Visual tension when extraction appears
- Risk of swarms during extraction

### Proposed Implementation

#### Extraction Zone Mechanics

**Spawn Rules**:
- **Timer**: Every 3 minutes (at 3:00, 6:00, 9:00, etc.)
- **Duration**: 30 seconds to enter zone
- **Location**: Random position away from player (min 400px, max 800px)
- **Cooldown**: 30 seconds between zone spawns (prevent spamming)
- **Max Active**: 1 extraction zone at a time

**Zone Properties**:
- **Radius**: 100px extraction zone
- **Visuals**: Pulsing circle, "EXTRACT" text above
- **Countdown**: Timer displayed above zone
- **Extraction Time**: 3 seconds to extract after entering zone

**Extraction Process**:
1. Zone spawns at random location
2. 30-second timer to reach zone
3. Player enters zone → 3-second extraction timer
4. Player must stay in zone for 3 seconds
5. Extraction successful → `gameOver(true)` called
6. All loot saved to stash

**Extraction Interrupted**:
- If player leaves zone before extraction completes:
  - Timer resets to 3 seconds
  - Must re-enter to continue extraction
- If player dies during extraction:
  - Only safe slot loot saved (normal death behavior)

#### Visual Design

**Zone Rendering**:
- Pulsing blue/green circle (100px radius)
- "EXTRACT" text floating above
- Countdown timer (seconds remaining)
- Arrow pointing toward zone when off-screen

**UI Updates**:
- Add "EXTRACT IN: XX" HUD indicator when zone active
- Show extraction progress bar when in zone (0-3 seconds)

#### Code Structure

**New Types** (types/index.ts):
```typescript
export interface ExtractionZone {
  x: number;
  y: number;
  radius: number;
  spawnTime: number; // Frame when spawned
  expiresAt: number; // Frame when zone disappears
  active: boolean;
  extractionProgress: number; // 0-180 frames (3 seconds)
}

export interface SpawnState {
  // ... existing
  extractionZone: ExtractionZone | null;
}
```

**New System** (src/systems/extraction.ts):
```typescript
export function shouldSpawnExtractionZone(
  mins: number,
  frames: number,
  lastExtractionSpawn: number
): boolean {
  // Spawn every 3 minutes
  const shouldSpawn = frames % (60 * 180) === 0; // 60fps * 180s = 3 min
  const cooldownPassed = (frames - lastExtractionSpawn) > (60 * 30); // 30s cooldown
  return shouldSpawn && cooldownPassed;
}

export function createExtractionZone(playerX: number, playerY: number): ExtractionZone {
  // Spawn 400-800px away from player in random direction
  const angle = Math.random() * Math.PI * 2;
  const dist = 400 + Math.random() * 400;
  return {
    x: (playerX + Math.cos(angle) * dist + CONFIG.worldSize) % CONFIG.worldSize,
    y: (playerY + Math.sin(angle) * dist + CONFIG.worldSize) % CONFIG.worldSize,
    radius: 100,
    spawnTime: frames,
    expiresAt: frames + 60 * 30, // 30 second duration
    active: true,
    extractionProgress: 0
  };
}

export function updateExtractionZone(
  zone: ExtractionZone,
  playerX: number,
  playerY: number,
  frames: number
): ExtractionZone {
  // Check if expired
  if (frames >= zone.expiresAt) {
    zone.active = false;
    return zone;
  }

  // Check if player is in zone
  const dist = Utils.getDist(playerX, playerY, zone.x, zone.y);
  if (dist < zone.radius) {
    zone.extractionProgress += 1; // 1 frame = 1/60 second
  } else {
    zone.extractionProgress = 0; // Reset if player leaves
  }

  // Check if extraction complete
  if (zone.extractionProgress >= 180) { // 3 seconds
    zone.active = false;
    // Trigger extraction
    Game.gameOver(true);
  }

  return zone;
}
```

**Game Integration** (game.ts):
```typescript
extractionZone: ExtractionZone | null = null;
lastExtractionSpawn: number = 0;

// In update():
if (shouldSpawnExtractionZone(this.mins, this.frames, this.lastExtractionSpawn)) {
  this.extractionZone = createExtractionZone(this.player.x, this.player.y);
  this.lastExtractionSpawn = this.frames;
}

if (this.extractionZone) {
  this.extractionZone = updateExtractionZone(
    this.extractionZone,
    this.player.x,
    this.player.y,
    this.frames
  );

  if (!this.extractionZone.active) {
    this.extractionZone = null;
  }
}

// In render():
if (this.extractionZone) {
  // Draw extraction zone circle and UI
}
```

---

## System 3: D2-Style Item Shop

### Design Goals
- Shop sells some good items (not just stat upgrades)
- Best items still found in-game
- Shop provides guaranteed progression
- Rotating stock or limited inventory?

### Proposed Implementation

#### Shop Items Categories

**1. Stat Upgrades** (existing):
- Might: +10% damage (max 5 levels)
- Vitality: +20 HP (max 5 levels)
- Haste: +5% speed (max 3 levels)
- Magnet: +20% pickup range (max 3 levels)
- Safe Container: +1 safe slot (max 3 slots total)

**2. Guaranteed Items** (NEW):
- Common/Magic tier items available for gold
- Prices based on rarity and tier
- 3-5 items for sale at a time
- Stock refreshes daily or after each run?

**3. Rare Specials** (NEW):
- Occasional rare items at premium price
- Limited quantity (1 per offer)
- Refresh timer

#### Item Pricing Structure

**Base Prices**:
- Common: 100-200G
- Magic: 300-500G
- Rare: 800-1200G
- Legendary: 2000-3000G (rarely available)

**Shop Inventory System**:
```typescript
export interface ShopItemListing {
  item: Item;
  price: number;
  listedAt: number; // Timestamp
  expiresAt: number; // Timestamp when item leaves shop
}

export interface ShopData {
  upgrades: ShopUpgrades; // Existing stat upgrades
  items: ShopItemListing[]; // NEW: Items for sale
  lastRefresh: number; // When inventory last refreshed
}
```

#### UI Changes

**Shop Screen** (`shop-screen`):
- Two tabs: "UPGRADES" and "ITEMS"
- Upgrades tab: existing stat upgrade grid
- Items tab: item cards showing:
  - Item preview (veiled? or revealed?)
  - Rarity indicator
  - Type indicator
  - Price
  - Time remaining
- "REFRESH" button (costs gold?)

#### Shop Mechanics

**Refresh System**:
- **Option A**: Refresh after each run (free)
- **Option B**: Daily refresh (real-time, like mobile games)
- **Option C**: Manual refresh (costs 100-200G)

**Item Generation**:
```typescript
export function generateShopItems(
  playerLevel: number,
  goldAvailable: number
): ShopItemListing[] {
  const listings: ShopItemListing[] = [];

  // Generate 3-5 items
  const count = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const rarity = rollShopRarity(playerLevel);
    const item = ItemGenerator.generate({
      itemType: 'weapon', // or random type
      luck: 0,
      minutesElapsed: playerLevel * 2, // Rough approximation
    });
    const price = calculateShopPrice(item);

    listings.push({
      item,
      price,
      listedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    });
  }

  return listings;
}
```

---

## Questions & Tradeoffs

### Safe Slots
1. **Slot replacement behavior**: When slots are full, should clicking an item:
   - Replace oldest secured item?
   - Do nothing and show "slots full" message?
   - Let user choose which slot to replace?

2. **Visual reveal during runs**: Should items in safe slots be:
   - Still veiled (revealed only after extraction)?
   - Partially revealed (rarity only)?
   - Fully visible (no risk)?

3. **Slot count cap**: Should we cap at 3 slots, or allow more with exponential cost?

### Extraction Zones
1. **Zone behavior**: When player dies near zone, should zone:
   - Remain active (new player can extract)?
   - Disappear on death?

2. **Extraction difficulty**: Should extraction zones spawn more enemies, or just swarm from existing spawns?

3. **Multiple zones**: Should we allow multiple zones simultaneously, or strictly one at a time?

4. **Zone warnings**: Should we add audio/visual warnings before zone spawns (like "Extraction available in 30 seconds")?

### Item Shop
1. **Veiled vs revealed items**: Should shop items be:
   - Revealed (you know what you're buying)?
   - Veiled (gamble, like gacha but with gold)?
   - Mixed (some revealed, some veiled)?

2. **Refresh mechanic**: Which refresh system do you prefer?
   - Free refresh after each run
   - Daily refresh (real-time)
   - Manual refresh (costs gold)

3. **Shop stock limit**: Should shop inventory be:
   - Unlimited stock of stat upgrades
   - Limited stock of items (3-5 rotating)
   - Both

4. **Special limited offers**: Should we add:
   - Daily rare items (like "Legendary sword - 24h only!")
   - Seasonal items
   - Event-specific items

---

## Implementation Priority

### Phase 1: Safe Slots Foundation
1. Update data structures (array instead of single ID)
2. Add shop upgrade for additional slots
3. Update UI to show multiple slots
4. Test safe slot behavior

### Phase 2: Extraction Zones Core
1. Create extraction zone entity/system
2. Implement spawn logic
3. Add zone rendering
4. Handle extraction trigger

### Phase 3: Extraction Polish
1. Add extraction timer/progress bar
2. Add zone warning UI
3. Tune spawn timing/rates
4. Playtest and adjust

### Phase 4: Item Shop Items
1. Design item shop data structures
2. Implement item generation for shop
3. Add items tab to shop UI
4. Add refresh mechanic

### Phase 5: Shop Content & Balance
1. Create shop item pool
2. Implement pricing logic
3. Add special limited offers
4. Balance economy

---

## Technical Considerations

### Save Data Migration
- Need to migrate existing save data when adding `safeSlots` field
- Default to 1 slot for existing players
- Handle null/undefined values safely

### Performance
- Extraction zone rendering (should be cheap)
- Shop item generation (batch on refresh, not every frame)
- Safe slot UI updates (only on change)

### Testing
- Safe slot: Test full/empty states, death, extraction
- Extraction zones: Test spawn, timer, interrupt, completion
- Shop: Test generation, purchase, refresh, expiry

---

## Future Enhancements

1. **Safe Slot Perks**:
   - Special safe slot types (e.g., " relic-only safe slot")
   - Safe slot upgrades (e.g., "reliable container" - never loses items)

2. **Extraction Variations**:
   - Different extraction types (e.g., "helicopter" vs "portal")
   - Co-op extraction (multiple players extract together)
   - Extraction events (e.g., "boss fight at extraction zone")

3. **Shop Features**:
   - Player-to-player trading (shop as marketplace)
   - Item crafting (combine shop items)
   - Daily deals/discounts
   - Reputation system (unlock better shop stock)

4. **Integration with Other Systems**:
   - Safe slots visible on character model (backpack)
   - Extraction zone mini-map
   - Shop discounts for achieving milestones
