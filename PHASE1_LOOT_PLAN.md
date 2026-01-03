# Loot System Roadmap: Complete Plan

---

## System Overview: How Components Tie Together

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GAME LOOP                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   DURING RUN                         BETWEEN RUNS                           │
│   ───────────                        ─────────────                          │
│   ┌──────────────┐    ┌───────────┐    ┌─────────────────────────────────┐ │
│   │ Enemy Death  │───▶│   Drop    │    │  ┌─────────┐    ┌─────────────┐  │ │
│   │              │    │  Check    │    │  │ Stash   │◀──▶│  Loadout    │  │ │
│   └──────────────┘    └─────┬─────┘    │  │ (50)    │    │ (6 slots)   │  │ │
│                             │          │  └────┬────┘    └──────┬──────┘  │ │
│                             ▼          │       │                │         │ │
│                     ┌─────────────┐   │       │                │         │ │
│                     │ Roll Rarity │   │       │                │         │ │
│                     │ (60/30/9/1) │   │       │                │         │ │
│                     └──────┬──────┘   │       │                │         │ │
│                            │          │       │                │         │ │
│                            ▼          │       │                │         │ │
│                     ┌─────────────┐   │       │                │         │ │
│                     │ Generate    │   │       │                │         │ │
│                     │ Veiled Item │   │       │                │         │ │
│                     └──────┬──────┘   │       │                │         │ │
│                            │          │       │                │         │ │
│                            ▼          │       │                │         │ │
│                     ┌─────────────┐   │       │                ▼         │ │
│                     │ Loot Orb    │   │       │        ┌─────────────┐  │ │
│                     │ Spawns      │   │       │        │   Stats     │  │ │
│                     └─────────────┘   │       │        │ Calculator  │  │ │
│                            │          │       │        └──────┬──────┘  │ │
│                            ▼          │       │               │         │ │
│                     ┌─────────────┐   │       │               ▼         │ │
│                     │ Player      │   │       │        ┌─────────────┐  │ │
│                     │ Collects    │   │       │        │   Player    │  │ │
│                     └──────┬──────┘   │       │        │  Weapons    │  │ │
│                            │          │       │        └─────────────┘  │ │
│                            ▼          │       └─────────────────────────┘ │
│                     ┌─────────────┐   │                                   │
│                     │ Extraction  │   │                                   │
│                     │ Triggered   │   │                                   │
│                     └──────┬──────┘   │                                   │
│                            │          │                                   │
│                            ▼          │                                   │
│                     ┌─────────────┐   │                                   │
│                     │ Reveal &    │   │                                   │
│                     │ Add to      │   │                                   │
│                     │ Stash       │───┼───────────────────────────────────┘ │
│                     └─────────────┘   │                                   │
│                                        │                                   │
└────────────────────────────────────────┴───────────────────────────────────┘
```

---

## The Math: How Loot Generation Works

### Rarity Roll (First Gate)

When a drop occurs, roll against this table:

| Rarity | Base Weight | Luck Factor | Effective Weight (0 Luck) | Effective Weight (100 Luck) |
|--------|-------------|-------------|--------------------------|----------------------------|
| Common | 600 | 1x | 60.0% | 60.0% |
| Magic | 300 | 1.2x | 30.0% | 31.6% |
| Rare | 90 | 1.5x | 9.0% | 11.3% |
| Legendary | 10 | 2x | 1.0% | 1.7% |
| **Relic** | 1 (per class) | 3x | 0.1% (if match) | 0.27% |

**Formula**: `adjustedWeight = baseWeight × (1 + luck/100 × luckFactor)`

### Affix Count (Second Gate)

Once rarity is determined, roll for number of affixes:

| Rarity | Min Affixes | Max Affixes | Distribution |
|--------|-------------|-------------|--------------|
| Common | 1 | 1 | Always 1 (small stat) |
| Magic | 1 | 2 | 50% each |
| Rare | 3 | 4 | 60% (3), 40% (4) |
| Legendary | 5 | 6 | 70% (5), 30% (6) |
| **Relic** | 1 unique + 2-3 | 1 unique + 2-3 | Always 1 unique, 2-3 standard |

### Affix Selection (Third Gate)

For each affix slot:
1. Filter **affix pool** by item type (e.g., Weapons can't drop +MaxHP)
2. Each affix has a **weight** (rarerness):
   - Common affixes: weight 100
   - Uncommon affixes: weight 50
   - Rare affixes: weight 20
   - Very rare affixes: weight 5

3. Roll weighted random from filtered pool
4. **No duplicate affix types** on same item

### Tier Roll (Fourth Gate)

Each affix has 5 tiers. Roll 1-5 with weights:
- T1: 40% (most common)
- T2: 30%
- T3: 20%
- T4: 8%
- T5: 2% (god tier)

**Legendary items** get +1 to minimum tier roll (can't roll T1).

### Drop Chance (Per Enemy)

```typescript
dropChance = baseChance × (1 + luck/200) × timeMultiplier

timeMultiplier = 1 + (minutesElapsed / 10)  // +10% per minute

// Examples:
// Basic enemy at 0 min, 0 luck: 5% × 1.0 × 1.0 = 5%
// Basic enemy at 10 min, 50 luck: 5% × 1.25 × 2.0 = 12.5%
// Basic enemy at 30 min, 100 luck: 5% × 1.5 × 4.0 = 30%
```

| Enemy Type | Base Drop Chance | Guaranteed? |
|------------|------------------|-------------|
| Basic | 5% | No |
| Fast/Bat | 3% | No |
| Elite | 100% | Yes (Magic+) |
| Boss | N/A | Yes (Rare+ + 2-3 Magic) |

**Relic Drops:**
- When a relic drops, it's **always for the current character** (no wasted drops)
- Elites: 2% chance for relic (if playing that class)
- Bosses: 10% chance for relic (guaranteed to be playable class)
- Base enemies: 0.1% × (1 + luck/100) chance for class relic

**Relic Tiers:**
- **Common Relics** (weaker, drop more often): ~5% from elites, 25% from bosses
- **Legendary Relics** (god tier, the ones listed above): Current rare rates
- This gives players smaller progression goals while hunting for the best ones

---

## Item Types (Locked In)

| Type | Slot | Who Can Equip | Notes |
|------|------|---------------|-------|
| WEAPON | mainHand | Any class | Modifies weapon behavior (damage, area, etc.) |
| HELM | head | Any class | Defense stats (HP, armor, speed) |
| ARMOR | body | Any class | HP/defense focus |
| ACCESSORY | 3 slots | Any class | Utility (magnet, luck, gold, cooldown) |
| RELIC | relic slot | **Specific class only** | Unique items with implicit min-max rolls |

## Relic Data Structure

Relics have fixed unique effects **plus** implicit stats that roll within min-max ranges (POE/Last Epoch style):

```typescript
export interface RelicDefinition {
  id: string;
  name: string;
  classId: string;
  icon: string;

  // Fixed unique effect
  uniqueEffect: {
    name: string;
    description: string;
    onHit?: (game: Game, target: Enemy, rolledValue: number) => void;
  };

  // Implicit stats with min-max rolls
  implicts: ImplicitStat[];
}

export interface ImplicitStat {
  type: AffixType;
  min: number;
  max: number;
  isPercent?: boolean;
}

// When relic drops, each implicit rolls a value:
export interface RelicInstance extends Item {
  // The actual rolled values
  rolledImplicts: { type: AffixType; value: number }[];
}
```

## Relic Display Format

When hovering a relic, show:
- The unique effect (always the same)
- Each implicit with its rolled value and possible range

```
┌─────────────────────────────────────────────────────────┐
│ 20-Sided Die                              LEGENDARY     │
│ ────────────────────────────────────────────────────── │
│                                                         │
│ UNIQUE: Nat 20                                          │
│ 5% chance to deal 10x damage                            │
│                                                         │
│ +52% Fire Damage (40-60)                               │
│ +3 Pierce (2-4)                                        │
│ +3 burn dmg/sec (2-4)                                  │
│ +6% crit chance (3-7)                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Format: `+rolledValue statName (min-max)`

## Equipment Slots (7 Total)

```
┌─────────────────────────────────────┐
│           [RELIC]                   │  ← Class-specific unique item
│                                     │
│    [HELM]        [WEAPON]    [ARMOR]│
│                                     │
│    [ACC1]   [ACC2]   [ACC3]         │  ← Utility accessories
└─────────────────────────────────────┘
```

## Relics: Class-Specific Unique Items

Relics are **legendary-tier** drops with unique affixes not available on random gear. Each character has their own relic pool. Only that character can equip their relics.

### Dungeon Master Relics
| Name | Unique Effect | Implicit Rolls (min-max) |
|------|---------------|-------------------------|
| **20-Sided Die** | 5% chance for 10x damage on any attack | +40-60% Fire Damage, +2-4 Pierce, +2-4 burn dmg/sec, 3-7% crit chance |
| **Player's Handbook** | Fireballs chain to 3 nearby enemies | +20-40% Fire Damage, +10-30% Area, +1-2 Projectiles |
| **DM Screen** | +100% luck, but -20% damage | +80-120% Luck, -15-25% Damage, +20-40% Gold |
| **Miniature** | Summons a tiny dragon ally that shoots fireballs | +10-20% Fire Damage, ally deals 5-15 damage/shot, +50-100% ally duration |
| **Natural 20** | Crits double your projectile count for 5 seconds | +2-5% Crit Chance, +30-50% Crit Damage, 5-10s duration |

### Janitor Relics
| Name | Unique Effect | Implicit Rolls (min-max) |
|------|---------------|-------------------------|
| **Wet Floor Sign** | Bubble aura leaves slowing trail on ground | +20-40% Bubble Area, 20-40% slow for 2-3s, +5-10 Speed |
| **Master Key** | Unlock chests without killing elite guardians | +30-50% Gold, chests drop 1-2 extra items |
| **Mop & Bucket** | Bubble stream +50% area, bubbles split on pop | +30-50% Bubble Area, splits into 2-3 mini-bubbles |
| **Janitor's Ring** | Bubbles heal you for 1 HP per pop | +1-2 HP per pop, +10-20% Bubble Duration |
| **Cleaning Supplies** | Kill 5 enemies in 3 seconds = gain shield for 10s | +50-100 shield amount, 8-12s shield duration |

### Skater Relics
| Name | Unique Effect | Implicit Rolls (min-max) |
|------|---------------|-------------------------|
| **Thrashed Deck** | CDs bounce 2 extra times, +1 pierce | +2-3 extra bounces, +1-2 Pierce, +10-20% Damage |
| **Skate Park Key** | +30% speed, knockback enemies you pass through | +25-40% Speed, +50-100 knockback force |
| **Graffiti Can** | CDs leave damaging paint trail (lasts 5 seconds) | +8-12s trail duration, +5-10 trail damage/sec |
| **Boombox** | CDs emit damaging pulse every second | +8-15 pulse damage, 0.8-1.2s pulse interval |
| **Ollie Record** | Double jump (ult activates twice) | +40-80% Ult Duration, +50-100% Ult Area |

### Mall Cop Relics
| Name | Unique Effect | Implicit Rolls (min-max) |
|------|---------------|-------------------------|
| **Taser** | Pepper spray chains to 2 nearby enemies | +2-3 chains, 10-20% chain damage falloff |
| **Badge of Authority** | +50% armor, elites drop 2 items instead of 1 | +40-60 Armor, 15-25% chance for extra elite drop |
| **Walkie-Talkie** | Every 60 seconds, spawn a decoy that distracts enemies | +50-80 decoy HP, 50-70s cooldown |
| **Donut Box** | Kill streak (5 kills in 3s) heals you for 25 HP | +20-40 heal amount, 4-6 kills, 3-5s window |
| **Break Room** | Standing still for 3 seconds regenerates HP | +3-6 HP/sec, 2-3s still time required |

### Chef Relics
| Name | Unique Effect | Implicit Rolls (min-max) |
|------|---------------|-------------------------|
| **Spatula** | Frying pan attacks apply "Burning" for 3 seconds | +8-12 burn damage/sec, 2-4s burn duration |
| **Chef's Hat** | Grease Fire ult +50% area, leaves fire trail | +40-60% Ult Area, fire deals 5-10 dmg/sec |
| **Deep Fryer** | Enemies killed by Frying Pan explode | +40-80 explosion damage, +60-100% explosion Area |
| **Menu Special** | +100% gold, food items heal 2x | +80-120% Gold, +80-120% food healing |
| **Secret Recipe** | Combining 3 food items grants random buff for 60s | +50-80s buff duration, +10-20% to all stats during buff |

### Teenager Relics
| Name | Unique Effect | Implicit Rolls (min-max) |
|------|---------------|-------------------------|
| **Vape Pen** | Lighter cone +50% length, passes through enemies | +40-60% cone length, +1-2 Pierce |
| **Smartphone** | Take selfie - gain shield for 5s (30s cooldown) | +4-8s shield duration, 25-35s cooldown, +50-100 shield |
| **Skateboard** | +100% speed, deal contact damage (15 dmg) | +80-120% Speed, +12-20 contact damage |
| **Energy Drink** | +25% attack speed, lose 1 HP/sec | +20-30% atk speed, -0.8-1.2 HP/sec |
| **Vape Cloud** | Ult now creates poison cloud (20 dmg/sec, 10s) | +15-25 poison dmg/sec, +8-12s cloud duration |

---

## Affix Pool with Weights

### Weapon Affixes

| Affix | Tiers | Weight | Notes |
|-------|-------|--------|-------|
| +Damage | 1-5 | 100 | Common |
| +%Damage | 1-5 | 80 | Common |
| +Area | 1-3 | 60 | Uncommon |
| +%Cooldown | 1-5 | 70 | Common |
| +Projectiles | 1-2 | 15 | Rare (very powerful) |
| +Pierce | 1-3 | 30 | Uncommon |
| +Duration | 1-4 | 40 | For aura weapons |
| +Speed | 1-4 | 50 | Uncommon |

### Armor/Helm Affixes

| Affix | Tiers | Weight | Notes |
|-------|-------|--------|-------|
| +MaxHP | 1-5 | 100 | Common |
| +Armor | 1-3 | 60 | Uncommon |
| +HP Regen | 1-4 | 40 | Uncommon |
| +Speed | 1-5 | 70 | Common |
| +%Healing | 1-3 | 30 | Rare |

### Accessory Affixes

| Affix | Tiers | Weight | Notes |
|-------|-------|--------|-------|
| +Magnet | 1-5 | 100 | Common |
| +Luck | 1-3 | 50 | Uncommon |
| +%Gold | 1-3 | 60 | Uncommon |
| +Speed | 1-5 | 80 | Common |
| +Pickup Radius | 1-3 | 40 | Uncommon |
| +%XP | 1-3 | 35 | Uncommon |
| +%Cooldown | 1-4 | 45 | Uncommon |

### Universal Affixes (Any Slot)

| Affix | Tiers | Weight | Notes |
|-------|-------|--------|-------|
| +%All Stats | 1-3 | 5 | Very Rare (legendary mostly) |

---

## Full Roadmap: Phase 0-7

### Phase 0: First Run Experience & Onboarding

**Goal**: Ensure players understand the core loop and feel rewarded in their first session.

**Files Created:**
- `src/data/starterGear.ts` - Basic items for new characters
- `src/systems/tutorial.ts` - First-run guidance

**Features:**

#### Starter Gear
Each character starts with **3 basic items** (Common/Magic tier):
- 1 WEAPON - Modifies starting weapon slightly
- 1 ARMOR - Small HP boost
- 1 ACCESSORY - Small quality of life (magnet or speed)

These are intentionally weak but functional. Players immediately understand how gear works.

Example DM starter loadout:
```
[RELIC]  (empty)
[HELM]   (empty)
[WEAPON] Apprentice Wand (+10% Fire Damage)
[ARMOR]  Tattered Robe (+20 Max HP)
[ACC1]   Rusty Compass (+20 Magnet)
[ACC2]   (empty)
[ACC3]   (empty)
```

#### Guaranteed First Relic
On first successful extraction:
- Guaranteed 1 relic drop (always for your character)
- **Poor roll** - minimum or near-minimum on all implicts
- Teaches players what relics are AND that rolls vary

Example: "Got 20-Sided Die with 42% Fire Damage (40-60)" - player sees the range, wants better.

#### First-Run Guidance
- Popup on first loot orb drop: "Collect loot orbs! Items reveal after extraction."
- HUD indicator for secure slot: "Press [I] to secure one item (saved on death)"
- First extraction: "Extraction successful! Your items have been revealed."
- Loadout screen prompt: "Equip items to make your next run stronger."

**Milestone**: New players complete first run, understand basics, have 1 relic to chase upgrades for.

---

## The Pitch

> **Survivor Protocol is a vampire survivor-style game where you risk your loot to get better loot.** Each run is a heist - collect veiled items during chaotic horde survival, race to extraction, and reveal your haul between runs. Build permanent arsenals with class-specific relics, min-max rolled gear, and synergistic loadouts. Die and lose everything (except one secured item).

**What Makes It Fun:**
1. **In-run power growth** - Level up weapons, unlock new abilities, feel yourself becoming godlike
2. **Loot chase** - Veiled items create extraction tension; reveals are slot-machine moments
3. **Buildcrafting** - 7 equipment slots, 30 class-specific relics, endless combinations
4. **Risk/reward** - Push deeper for better loot vs. extract early to secure gains
5. **Endgame grind** - Farm bosses for relics, hunt god rolls, tackle modifier maps

---

### Phase 1: Core Item System

**Files Created:**
- `src/items/types.ts` - All interfaces and enums
- `src/items/affixTables.ts` - Affix pool with weights
- `src/items/generator.ts` - Item generation logic
- `src/items/__tests__/generator.test.ts`

**Implementation:**
1. Define `Item`, `Affix`, `ItemRarity`, `ItemType` interfaces
2. Create affix pool table with weights and tiers
3. Implement `ItemGenerator.generate(tier, luck)`:
   - Roll rarity with luck scaling
   - Roll affix count based on rarity
   - Roll each affix from filtered pool (no dupes)
   - Roll tier for each affix
   - Generate name (prefix + base + suffix)
4. Write unit tests for generation distribution

**Milestone**: Can generate 10,000 items and verify distribution matches expected probabilities.

---

### Phase 2: In-Run Drops & Collection

**Files Created:**
- `src/items/drops.ts` - Drop chance calculation
- `src/systems/loot.ts` - Loot orb entity and rendering
- `src/assets/itemOrbSprites.ts` - Visual assets

**Implementation:**
1. Implement `LootDrop.dropChance(enemy, luck, time)`:
   - Base 5% for basic enemies
   - Time scaling: +10% per minute
   - Luck scaling: up to +50% bonus
2. Integrate drops into `Enemy.die()`:
   - Roll drop chance
   - If success, generate veiled item
   - Spawn loot orb at death position
3. Create `LootOrb` entity:
   - Similar to XP gem but purple/gold color
   - Magnet collection logic
   - Collected items go to `Game.collectedLoot[]`
4. Add HUD counter: "Veiled: 3" + inventory button
   - **Inventory button** (pauses game): Opens simple grid showing collected veiled items
   - **Secure slot**: Player can mark ONE item as secured (saved on death)
   - Visual indicator on secured item (gold border?)

**Milestone**: Killing enemies spawns loot orbs that can be collected; HUD tracks veiled count.

---

### Phase 3: Stash & Persistence

**Files Created:**
- `src/items/stash.ts` - Stash management
- `src/systems/stashUI.ts` - Stash grid UI

**Modified Files:**
- `src/systems/saveData.ts` - Add stash to save structure

**Implementation:**
1. Implement `Stash` class:
   - 200 slots array
   - `addItem(item)` - finds first empty slot
   - `removeItem(index)`
   - `swap(from, to)` - for drag-drop
   - `toJSON()` / `fromJSON()` for save/load
2. Update `SaveData`:
   ```typescript
   interface SaveData {
     gold: number;
     ownedCharacters: string[];
     selectedCharacter: string;
     shopUpgrades: ShopUpgrades;
     stash: StashSlot[];  // NEW
     loadout: LoadoutData; // NEW
   }
   ```
3. Create stash grid UI:
   - 10x20 grid (200 slots)
   - Hover tooltips for items
   - Click to select (for equip/trash)

**Milestone**: Extracted items appear in stash; persists across page reloads.

---

### Phase 4: Loadout & Stat Application

**Files Created:**
- `src/items/loadout.ts` - Equipment loadout
- `src/items/stats.ts` - Stat calculation
- `src/systems/loadoutUI.ts` - Character screen

**Modified Files:**
- `src/entities/player.ts` - Replace passives with loadout
- `src/game.ts` - Apply loadout stats on run start

**Implementation:**
1. Implement `Loadout` class:
   ```typescript
   interface LoadoutSlots {
     relic: Item | null;      // NEW: Class-specific unique item
     weapon: Item | null;
     helm: Item | null;
     armor: Item | null;
     accessory1: Item | null;
     accessory2: Item | null;
     accessory3: Item | null;
   }
   ```
2. Implement `ItemStats.calculate(loadout)`:
   - Sum all affix values by type
   - Calculate final multipliers
   - Return `StatBlock` with all modifiers
3. Apply stats to player:
   ```typescript
   // In Player constructor
   this.maxHp = baseHp + stats.maxHp;
   this.speed = baseSpeed + stats.speed;
   this.magnet = baseMagnet + stats.magnet;
   ```
4. Apply stats to weapons:
   ```typescript
   // When firing weapon
   const damage = (weapon.damage + stats.flatDamage) * (1 + stats.percentDamage);
   const cooldown = weapon.cooldown * (1 - stats.percentCooldown);
   ```
5. Create loadout UI:
   - Left: Character paper doll
   - Right: Stash grid
   - Drag-drop between stash and slots
   - Stat summary panel

**Milestone**: Equipping items visibly changes gameplay (more damage, faster, etc.).

---

### Phase 5: The Gambler (Trader)

**Files Created:**
- `src/systems/gambler.ts` - Gambling mechanic
- `src/data/gamblerStock.ts` - Gambler item pools

**Features:**

#### Mystery Items
Pay gold to get a veiled item with boosted rarity chances:

| Option | Cost | Rarity Boost |
|--------|------|--------------|
| Mystery Weapon | 500 | Common: 30%, Magic: 50%, Rare: 18%, Legendary: 2% |
| Mystery Armor | 800 | Common: 30%, Magic: 50%, Rare: 18%, Legendary: 2% |
| Mystery Accessory | 400 | Common: 30%, Magic: 50%, Rare: 18%, Legendary: 2% |
| Cursed Item | 1000 | Rare: 40%, Legendary: 10%, Corrupted: 50% |

#### Corrupted Items
New rarity with powerful affixes AND drawbacks:

```typescript
interface CorruptedAffix extends Affix {
  type: AffixType;
  value: number;
  drawback: {
    type: AffixType;  // Negative stat
    value: number;    // Negative value
  };
}
```

Examples:
- "Berserker's Blade": +100% Damage, -50% MaxHP
- "Greed's Embrace": +200% Gold, -25% Speed, Take 25% more damage
- "Phasing Boots": +100% Speed, Cannot deal damage
- "Vampire's Hunger": +50% Lifesteal, Lose 1 HP/sec

#### Gambler UI
- New tab in menu (Character / Merchant)
- Grid of mystery items to buy
- One-time reveal on purchase
- Prices scale with player level

**Milestone**: Players can spend gold on gambling; corrupted items offer high-risk/high-reward builds.

---

### Phase 6: Crafting & Rerolling

**Files Created:**
- `src/systems/crafting.ts` - Crafting mechanics
- `src/data/craftingRecipes.ts` - Recipe definitions

**Features:**

#### Scrap System
- Any item can be "scrapped" for currency
- Scrap amount based on rarity and tier:
  - Common: 10-20 scrap
  - Magic: 50-100 scrap
  - Rare: 200-400 scrap
  - Legendary: 1000-2000 scrap
  - Corrupted: 500-3000 scrap

#### Reroll Affix
Replace a single affix with a new random one:

| Action | Cost |
|--------|------|
| Reroll 1 affix (common item) | 50 scrap |
| Reroll 1 affix (rare item) | 200 scrap |
| Reroll 1 affix (legendary) | 1000 scrap |

#### Upgrade Tier
Increase the tier value of an existing affix:

| Current Tier | Upgrade Cost | Success Rate |
|--------------|--------------|--------------|
| T1 → T2 | 100 scrap | 100% |
| T2 → T3 | 250 scrap | 100% |
| T3 → T4 | 500 scrap | 80% |
| T4 → T5 | 1000 scrap | 50% |

Failure = item destroyed (risk/reward).

#### Add Affix Slot
Add an empty affix slot to an item (fills immediately with random affix):

| Base Rarity | Cost |
|-------------|------|
| Magic (1→2 affixes) | 500 scrap |
| Rare (3→4 affixes) | 2000 scrap |

#### Crafting UI
- "Salvage" button on stash items
- "Modify" button opens crafting menu
- Shows cost and success rates
- Confirm dialogs for destructive actions

**Milestone**: Players can invest in favorite items; deep endgame crafting goals.

---

## Deferred to Post-MVP

- **Set Items**: 2-4 piece bonuses, require collecting multiple items
- **Uniques**: Named items with fixed, unique affix combinations
- **Extraction Events**: Guarded unique drops at extraction point
- **Item Visuals**: Sprites beyond colored placeholders
- **Socketables**: Gems/runes that can be inserted into items
- **Runewords**: Specific socket combinations grant bonuses

---

## Affix Values (All Tiers)

### Flat Values

| Affix | T1 | T2 | T3 | T4 | T5 |
|-------|----|----|----|----|-----|
| +Damage | 2 | 5 | 10 | 18 | 30 |
| +Area | 10 | 25 | 50 | - | - |
| -Cooldown (s) | -0.2 | -0.4 | -0.6 | -0.9 | -1.2 |
| +Projectiles | +1 | +1 | +2 | - | - |
| +Pierce | +1 | +2 | +3 | - | - |
| +Duration | +1s | +2s | +3s | +4s | - |
| +Speed | 5 | 10 | 18 | 30 | 50 |
| +Magnet | 10 | 20 | 35 | 55 | 80 |
| +MaxHP | 10 | 25 | 50 | 100 | 200 |
| +Armor | 1 | 2 | 4 | 7 | 12 |
| +HP Regen/s | 0.5 | 1 | 2 | 4 | - |
| +Pickup Radius | 5 | 10 | 20 | - | - |

### Percentage Values

| Affix | T1 | T2 | T3 | T4 | T5 |
|-------|----|----|----|----|-----|
| +%Damage | 10% | 20% | 35% | 50% | 75% |
| +%Area | 15% | 30% | 50% | - | - |
| +%Cooldown | -10% | -18% | -28% | -40% | -55% |
| +%Healing | 15% | 30% | 50% | - | - |
| +%Gold | 20% | 40% | 75% | 120% | - |
| +%XP | 15% | 30% | 50% | - | - |
| +%All Stats | 5% | 10% | 15% | - | - |

---

## Rarity Color Coding

| Rarity | Border | Text | Background | Label |
|--------|--------|------|------------|-------|
| Common | #5a5a5a | #a0a0a0 | #1a1a1a | Base |
| Magic | #3b82f6 | #60a5fa | #1e3a8a/30 | Magic |
| Rare | #eab308 | #facc15 | #713f12/30 | Rare |
| Legendary | #f97316 | #fb923c | #7c2d12/30 | Legendary |
| Corrupted | #dc2626 | #ef4444 | #450a0a/40 | Corrupted |

---

## Success Criteria by Phase

### Phase 0
- ✅ Starter gear equipped on new characters
- ✅ First-run guidance popups trigger correctly
- ✅ Guaranteed relic drops on first successful extraction
- ✅ New players understand loot, extraction, loadout basics

### Phase 1
- ✅ Item generation with correct distribution
- ✅ Unit tests passing

### Phase 2
- ✅ Loot orbs drop from enemies
- ✅ Collection and tracking works

### Phase 3
- ✅ Stash UI functional
- ✅ Save/load persistence working

### Phase 4
- ✅ Loadout UI with drag-drop
- ✅ Equipping items changes gameplay

### Phase 5
- ✅ Merchant tab functional
- ✅ Gambling feels rewarding
- ✅ Corrupted items enable new builds

### Phase 6
- ✅ Scrap system working
- ✅ Reroll/upgrading functional
- ✅ Risk/reward crafting engaging

### Phase 7
- ✅ Boss-specific relic pools functional
- ✅ Map selection UI shows relic targets
- ✅ Map modifiers create meaningful build choices
- ✅ Reward scaling feels fair for added difficulty
- ✅ Players have reasons to farm different bosses

---

## Phase 7: Bosses & Map Modifiers (Endgame)

**Files Created:**
- `src/data/bosses.ts` - Boss definitions with relic pools
- `src/data/mapModifiers.ts` - Map modifier definitions
- `src/systems/mapSelect.ts` - Map/modifier selection UI

**Features:**

#### Boss-Specific Relic Pools
Each boss drops relics from their specific pool:

| Boss | Theme | Relic Pool | Classes |
|------|-------|------------|---------|
| **Dragon Lord** | Castle/Dungeon | 20-Sided Die, DM Screen, Natural 20, Miniature | DM |
| **Giant Janitor Bot** | Mall/Food Court | Wet Floor Sign, Master Key, Mop & Bucket, Janitor's Ring | Janitor |
| **Security Chief** | Mall Security Office | Taser, Badge of Authority, Walkie-Talkie, Donut Box | Mall Cop |
| **Skater Gang Leader** | Parking Lot | Thrashed Deck, Graffiti Can, Boombox, Ollie Record | Skater |
| **Rat King** | Kitchen/Backrooms | Spatula, Deep Fryer, Chef's Hat, Menu Special | Chef |
| **Posse of Teens** | Arcade | Vape Pen, Smartphone, Skateboard, Energy Drink | Teenager |

**Drop logic:**
- Boss always drops 1 relic from their pool (random which)
- With map modifiers: can drop 2+ relics
- Same relic can drop multiple times (chase for better rolls)

#### Map Modifiers (Atlas Style)
Before starting a run, select modifiers:

| Modifier | Effect |
|----------|--------|
| **Frenzied** | Enemies +50% speed, +20% drop rate, +25% damage |
| **Tanky** | Enemies +100% HP, +1 item tier, +25% damage |
| **Swarm** | 2x spawn rate, +30% drop rate, enemies -20% max HP |
| **Precision** | Enemies -50% size, +50% speed, +2 rarity tiers, +20% damage (100g) |
| **Bloodlust** | Enemies deal 2x damage, elites drop 2 items (200g) |
| **Economy** | No healing drops, +100% gold, +1 tier (150g) |
| **Chaos** | Random enemy types, boss drops 2 relics, elite spawn rate +50% (300g) |

#### Reward Scaling by Stacks
| Modifiers | Rarity Boost | Relic Chance | Boss Drops |
|-----------|--------------|--------------|------------|
| 0 | Base | 0.1% | 1 item |
| 1 | +1 tier | 2x | 1-2 items |
| 2+ | +2 tiers | 3x | 2-3 items, guaranteed relic |

#### Map Selection UI
- Grid of available maps/bosses
- Shows: boss name, relic pool, best modifier strategies
- Click map → select modifiers → start run

**Example flow:**
```
1. "I need 20-Sided Die for my DM"
2. Select Dragon Lord map
3. Add: Bloodlust + Chaos (3x relic chance!)
4. Swap loadout: +%HP, Armor, Regen (survival focus)
5. Run → Extract with 2 relics!
6. "Got 20-Sided Die with 57% Fire Damage - nice!"
7. Repeat for god roll (60%)
```

**Milestone**: Players farm specific bosses for targeted relics; map modifiers create build diversity and endgame challenges.

---

## Open Questions

1. **Level Requirements**: Should items have "Requires Level X"?
   - Proposal: No, let players power-game if they get lucky

2. **Death Penalty**: Full loot loss or partial?
   - Proposal: Lose all collected veiled items; equipped stash items always safe
   - **Secure Slot (Tarkov-style)**: One "secured" slot per run - player can choose ONE veiled item to secure during the run. Secured item is saved on death. Player chooses strategically (best-looking orb? risk management?). Add inventory button (pauses game) to manage this.
   - No "first run forgiveness" - stakes are real from the start. Starter gear + guaranteed relic on first extraction give early progression.

3. **Extraction Trigger**: Timer-based or location-based?
   - Proposal: Both - extraction zones appear at 5 min, final extraction at 10 min

4. **Weapon Slot**: Does it replace character starting weapon or modify it?
   - Proposal: Modifies it - characters keep identity, weapon items add stats

5. **Corrupted Item Drawbacks**: Can they be removed?
   - Proposal: No - that's the price of power. Maybe late-game "Purify" crafting option (very expensive)
