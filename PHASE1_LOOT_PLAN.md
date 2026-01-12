# Loot System Roadmap: Complete Plan

---

## Status Notes (Current Implementation)

- Relics currently roll standard affixes (same pool as other items) and display unique effect text; implicit min/max roll ranges are not implemented yet.
- Class-specific relics are now defined in `src/data/relics.ts` and generated via `ItemGenerator.generateRelic()`.

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
│   └──────────────┘    └─────┬─────┘    │  │ (200)   │    │ (7 slots)   │  │ │
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

### Rarity Roll (First Gate - Non-Relic Items)

When a drop occurs, roll against this table:

| Rarity | Base Weight | Luck Factor | Effective Weight (0 Luck) | Effective Weight (100 Luck) |
|--------|-------------|-------------|--------------------------|----------------------------|
| Common | 600 | 0x | 60.0% | 39.6% |
| Magic | 300 | 1.2x | 30.0% | 43.6% |
| Rare | 90 | 1.5x | 9.0% | 14.9% |
| Legendary | 10 | 2x | 1.0% | 2.0% |

**Formula**: `adjustedWeight = baseWeight × (1 + luck/100 × luckFactor)`

Luck only scales Magic+ tiers (Common uses `luckFactor = 0`) so luck meaningfully shifts weight upward.

### Relic Gate (Separate from Rarity)

Relic rolls are a separate gate and do **not** use the normal rarity table.

**Non-boss enemies:**
1. Roll relic chance (scaled by luck).
2. If success, generate a relic; if fail, proceed to the normal rarity roll above.

Relic roll chances (non-boss, all use `× (1 + luck/100)`):
| Enemy Type | Base Relic Chance | Notes |
|------------|------------------|-------|
| Basic | 0.1% | Replaces normal drop on success |
| Elite | 2% | In addition to guaranteed elite drop |

Bosses skip this gate and use Boss Relic Drops (see Phase 7).

Relics always match the run's **attuned class** (defaults to current character).
Attunement = which class's relic pool is active for the run (default selected character, map selection can override).

TODO (MVP): Attunement defaults to selected character for now (debug-friendly); revisit later.

### Global Relic Drop Table (Attuned Class Pool)

Each relic in a class pool has a weight tier. This is the D2-style rarity within a pool.

| Tier | Weight | Intent |
|------|--------|--------|
| Common | 100 | Baseline |
| Uncommon | 40 | Noticeably rarer |
| Rare | 15 | Chase |
| Chase | 5 | Ultra chase |

**Boss bonus:** when a boss rolls a relic, multiply weights for Rare and Chase tiers by 2x (Common/Uncommon unchanged).

Relics are always legendary-tier; rarity is handled by weights within the relic pool.

### Affix Count (Second Gate)

Once rarity is determined, roll for number of affixes:

| Rarity | Min Affixes | Max Affixes | Distribution |
|--------|-------------|-------------|--------------|
| Common | 1 | 1 | Always 1 (small stat) |
| Magic | 1 | 2 | 50% each |
| Rare | 3 | 4 | 60% (3), 40% (4) |
| Legendary | 5 | 6 | 70% (5), 30% (6) |

Relics bypass this table: they always have 1 unique effect + 2-3 implicits.

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
5. **Prefix/Suffix mapping (POE-style):** certain affix types map to name components.
   - Prefixes come from primary affixes (damage, speed, HP, cooldown, etc.).
   - Suffixes come from secondary affixes (utility, luck, gold, XP, etc.).
   - If the item rolls multiple eligible affixes, pick the highest-tier affix for prefix/suffix (tie-break by weight).
   - If no eligible affix exists, fall back to the generic prefix/suffix pool.
   - MVP: only apply to non-relic items.

### Tier Roll (Fourth Gate)

Each affix has 5 tiers. Roll 1-5 with weights:
- T1: 40% (most common)
- T2: 30%
- T3: 20%
- T4: 8%
- T5: 2% (god tier)

**Legendary items** get +1 to minimum tier roll (can't roll T1).
**Corrupted items** (gambler-only) use Legendary tier rules for positive affixes; the drawback affix does not roll tiers.

### Drop Chance (Per Enemy)

```typescript
dropChance = baseChance × (1 + luck/200) × timeMultiplier

timeMultiplier = 1 + (min(minutesElapsed, 20) / 10)  // +10% per minute, capped at +200%

// Examples:
// Basic enemy at 0 min, 0 luck: 5% × 1.0 × 1.0 = 5%
// Basic enemy at 10 min, 50 luck: 5% × 1.25 × 2.0 = 12.5%
// Basic enemy at 30 min, 100 luck: 5% × 1.5 × 3.0 = 22.5% (cap reached)
```

| Enemy Type | Base Drop Chance | Guaranteed? |
|------------|------------------|-------------|
| Basic | 5% | No |
| Fast/Bat | 3% | No |
| Elite | 100% | Yes (Magic+) |
| Boss | N/A | Yes (Rare+ + 2-3 Magic, plus relic from boss rules) |

**Relic Drops (Summary):**
- Relic roll is separate for non-boss enemies; bosses use Boss Relic Drops (Phase 7).
- Basics replace the normal drop on relic success; elites add a relic on top of their guaranteed drop.
- Relics are always for the run's **attuned class** (defaults to current character).
- Relic selection uses the Global Relic Drop Table weights (bosses get a Rare/Chase weight bonus).

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
  weightTier: RelicWeightTier;

  // Fixed unique effect
  uniqueEffects: RelicEffect[];

  // Implicit stats with min-max rolls
  implicits: ImplicitStat[];
}

export type RelicTrigger =
  | "passive"
  | "onHit"
  | "onKill"
  | "onPickup"
  | "onTimer"
  | "onExtract";

export interface RelicEffect {
  name: string;
  description: string;
  trigger: RelicTrigger;
}

export type RelicWeightTier = "common" | "uncommon" | "rare" | "chase";

export interface ImplicitStat {
  type: AffixType;
  min: number;
  max: number;
  isPercent?: boolean;
}

// When relic drops, each implicit rolls a value:
export interface RelicInstance extends Item {
  // The actual rolled values
  rolledImplicits: { type: AffixType; value: number }[];
}
```

Reminder: update the relic effect schema with values/duration/cooldowns and handler hooks before implementation.
TODO (MVP): Decide if relic unique effects are active in Phase 4 or if MVP only applies implicits.

## Relic Display Format

When hovering a relic, show:
- The unique effect (always the same)
- Each implicit with its rolled value and possible range

```
┌─────────────────────────────────────────────────────────┐
│ Arcane Die                                LEGENDARY     │
│ ────────────────────────────────────────────────────── │
│                                                         │
│ UNIQUE: Fate Roll                                       │
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

Relics are **legendary-tier** drops with unique affixes not available on random gear. Each character has their own relic pool, and each relic is tagged with a weight tier (Common/Uncommon/Rare/Chase) from the Global Relic Drop Table. Only that character can equip their relics.

### Wizard Relics
| Name | Unique Effect | Implicit Rolls (min-max) | Weight Tier |
|------|---------------|--------------------------|-------------|
| **Arcane Die** | 5% chance for 10x damage on any attack | +40-60% Fire Damage, +2-4 Pierce, +2-4 burn dmg/sec, 3-7% crit chance | Chase |
| **Grimoire of Chains** | Fireballs chain to 3 nearby enemies | +20-40% Fire Damage, +10-30% Area, +1-2 Projectiles | Common |
| **Warding Screen** | +100% luck, but -20% damage | +80-120% Luck, -15-25% Damage, +20-40% Gold | Rare |
| **Familiar Figurine** | Summons a tiny dragon ally that shoots fireballs | +10-20% Fire Damage, ally deals 5-15 damage/shot, +50-100% ally duration | Common |
| **Critical Convergence** | Crits double your projectile count for 5 seconds | +2-5% Crit Chance, +30-50% Crit Damage, 5-10s duration | Uncommon |

### Paladin Relics
| Name | Unique Effect | Implicit Rolls (min-max) | Weight Tier |
|------|---------------|--------------------------|-------------|
| **Consecrated Banner** | Aura leaves slowing consecrated trail on ground | +20-40% Aura Area, 20-40% slow for 2-3s, +5-10 Speed | Common |
| **Reliquary Key** | Unlock chests without killing elite guardians | +30-50% Gold, chests drop 1-2 extra items | Chase |
| **Sanctified Flail** | Smite stream +50% area, bolts split on hit | +30-50% Smite Area, splits into 2-3 bolts | Rare |
| **Paladin's Ring** | Auras heal you for 1 HP per hit | +1-2 HP per hit, +10-20% Aura Duration | Common |
| **Aegis Oath** | Kill 5 enemies in 3 seconds = gain shield for 10s | +50-100 shield amount, 8-12s shield duration | Uncommon |

### Rogue Relics
| Name | Unique Effect | Implicit Rolls (min-max) | Weight Tier |
|------|---------------|--------------------------|-------------|
| **Shadow Chakram** | Thrown blades bounce 2 extra times, +1 pierce | +2-3 extra bounces, +1-2 Pierce, +10-20% Damage | Chase |
| **Nightstep Boots** | +30% speed, knockback enemies you pass through | +25-40% Speed, +50-100 knockback force | Common |
| **Venom Vial** | Thrown blades leave damaging poison trail (lasts 5 seconds) | +8-12s trail duration, +5-10 trail damage/sec | Common |
| **Cloak of Knives** | Emit damaging pulse every second | +8-15 pulse damage, 0.8-1.2s pulse interval | Uncommon |
| **Second Shadow** | Double dash (ult activates twice) | +40-80% Ult Duration, +50-100% Ult Area | Rare |

### Knight Relics
| Name | Unique Effect | Implicit Rolls (min-max) | Weight Tier |
|------|---------------|--------------------------|-------------|
| **Chain Smite** | Primary attack chains to 2 nearby enemies | +2-3 chains, 10-20% chain damage falloff | Rare |
| **Royal Crest** | +50% armor, elites drop 2 items instead of 1 | +40-60 Armor, 15-25% chance for extra elite drop | Chase |
| **Squire's Banner** | Every 60 seconds, spawn a decoy that distracts enemies | +50-80 decoy HP, 50-70s cooldown | Uncommon |
| **Battle Rations** | Kill streak (5 kills in 3s) heals you for 25 HP | +20-40 heal amount, 4-6 kills, 3-5s window | Common |
| **Knight's Rest** | Standing still for 3 seconds regenerates HP | +3-6 HP/sec, 2-3s still time required | Common |

### Pyromancer Relics
| Name | Unique Effect | Implicit Rolls (min-max) | Weight Tier |
|------|---------------|--------------------------|-------------|
| **Cinder Brand** | Attacks apply "Burning" for 3 seconds | +8-12 burn damage/sec, 2-4s burn duration | Common |
| **Pyromancer's Hood** | Grease Fire ult +50% area, leaves fire trail | +40-60% Ult Area, fire deals 5-10 dmg/sec | Uncommon |
| **Inferno Core** | Enemies killed by fire explode | +40-80 explosion damage, +60-100% explosion Area | Rare |
| **Ember Feast** | +100% gold, food items heal 2x | +80-120% Gold, +80-120% food healing | Common |
| **Forbidden Formula** | Combining 3 food items grants random buff for 60s | +50-80s buff duration, +10-20% to all stats during buff | Chase |

### Berserker Relics
| Name | Unique Effect | Implicit Rolls (min-max) | Weight Tier |
|------|---------------|--------------------------|-------------|
| **Blood Howl** | Cleave cone +50% length, passes through enemies | +40-60% cleave length, +1-2 Pierce | Common |
| **War Cry** | Gain shield for 5s (30s cooldown) | +4-8s shield duration, 25-35s cooldown, +50-100 shield | Common |
| **Rampage Greaves** | +100% speed, deal contact damage (15 dmg) | +80-120% Speed, +12-20 contact damage | Chase |
| **Rage Draught** | +25% attack speed, lose 1 HP/sec | +20-30% atk speed, -0.8-1.2 HP/sec | Rare |
| **Bloodsmoke** | Ult now creates blood cloud (20 dmg/sec, 10s) | +15-25 blood dmg/sec, +8-12s cloud duration | Uncommon |

---

## Affix Pool with Weights

### Weapon Affixes

| Affix | Tiers | Weight | Notes |
|-------|-------|--------|-------|
| +Damage | 1-5 | 100 | Common |
| +%Damage | 1-5 | 80 | Common |
| +Area | 1-3 | 60 | Uncommon |
| +%Area | 1-3 | 40 | Uncommon |
| Cooldown Reduction % | 1-5 | 70 | Common |
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
| Cooldown Reduction % | 1-4 | 45 | Uncommon |

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

Example Wizard starter loadout:
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
- **Poor roll** - minimum or near-minimum on all implicits
- Teaches players what relics are AND that rolls vary

Example: "Got Arcane Die with 42% Fire Damage (40-60)" - player sees the range, wants better.

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
   - Generate name:
     - Base from item type pool
     - Prefix/suffix derived from affix types (POE-style mapping)
     - Fallback to generic prefix/suffix if no mapped affixes
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
   - Time scaling: +10% per minute, capped after 20 minutes
   - Luck scaling: up to +50% bonus
2. Integrate drops into `Enemy.die()`:
   - Roll drop chance
   - If success, generate veiled item
   - Spawn loot orb at death position
   - TODO (MVP): Attunement source is selected character for now; revisit later.
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
   const cooldown = weapon.cooldown * (1 - stats.cooldownReduction);
   ```
5. Create loadout UI:
   - Left: Character paper doll
   - Right: Stash grid
   - Drag-drop between stash and slots
   - Stat summary panel

**Milestone**: Equipping items visibly changes gameplay (more damage, faster, etc.).

---

### Design Inspiration: Inventory & Merchant UI (Reference)

Use this as visual/interaction inspiration for the loadout + stash screen and the merchant stretch feature. The sample includes hover tooltips, drag/drop, and a two-tab character/merchant layout; adapt to the 7-slot equipment layout and current item types.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Sword, Shirt, Hexagon, Footprints, Hand, Circle, Ghost,
  Crown, Anchor, Zap, Skull, Info, X, Book, Flame, Star, Cross, 
  HelpCircle, Coins, Store, User
} from 'lucide-react';

/**
 * --- DATA & CONSTANTS ---
 */

const RARITY = {
  NORMAL: { color: 'text-neutral-300', border: 'border-neutral-600', bg: 'bg-neutral-900', label: 'Base' },
  EVOLVED: { color: 'text-red-500', border: 'border-red-600', bg: 'bg-red-900/30', label: 'Evolved' },
  RELIC: { color: 'text-yellow-300', border: 'border-yellow-500', bg: 'bg-yellow-900/30', label: 'Relic' },
  ARCANAS: { color: 'text-purple-400', border: 'border-purple-600', bg: 'bg-purple-900/40', label: 'Arcana' },
};

const ITEM_TYPES = {
  HELM: 'helm',
  ARMOR: 'armor',
  WEAPON: 'weapon',
  OFFHAND: 'offhand',
  ACCESSORY: 'accessory', 
};

// Define valid item types for each equipment slot
const EQUIPMENT_SLOTS = {
  head: [ITEM_TYPES.HELM],
  body: [ITEM_TYPES.ARMOR],
  mainHand: [ITEM_TYPES.WEAPON], 
  offHand: [ITEM_TYPES.OFFHAND], 
  accessory1: [ITEM_TYPES.ACCESSORY],
  accessory2: [ITEM_TYPES.ACCESSORY],
  accessory3: [ITEM_TYPES.ACCESSORY],
  accessory4: [ITEM_TYPES.ACCESSORY],
  accessory5: [ITEM_TYPES.ACCESSORY],
  accessory6: [ITEM_TYPES.ACCESSORY],
};

const INITIAL_ITEMS = [
  {
    id: 'item-1',
    name: 'Vampire Killer',
    type: ITEM_TYPES.WEAPON,
    rarity: RARITY.NORMAL,
    icon: Sword,
    stats: [
      { label: '+10 Base Damage', color: 'red' },
      { label: 'Passes through enemies', color: 'red' },
    ],
    baseStats: { label: 'Level 8', color: 'white' }
  },
  {
    id: 'item-2',
    name: 'King Bible',
    type: ITEM_TYPES.OFFHAND,
    rarity: RARITY.NORMAL,
    icon: Book,
    stats: [
      { label: '+40% Area', color: 'green' },
      { label: '+30% Speed', color: 'green' },
      { label: 'Orbits Character', color: 'gray' },
    ],
    baseStats: { label: 'Level 5', color: 'white' }
  },
  {
    id: 'item-3',
    name: 'Crimson Shroud',
    type: ITEM_TYPES.ARMOR,
    rarity: RARITY.EVOLVED,
    icon: Shirt,
    stats: [
      { label: 'Caps incoming damage at 10', color: 'yellow' },
      { label: 'Retaliates on hit', color: 'red' },
    ],
    baseStats: { label: 'Evolution', color: 'purple' }
  },
  {
    id: 'item-4',
    name: 'Spinach',
    type: ITEM_TYPES.ACCESSORY,
    rarity: RARITY.NORMAL,
    icon: Flame,
    stats: [
      { label: '+50% Might', color: 'red' },
    ],
    baseStats: { label: 'Passive', color: 'gray' }
  },
];

const GAMBLE_STOCK = [
  { type: ITEM_TYPES.WEAPON, icon: Sword, cost: 500, label: 'Mystery Weapon' },
  { type: ITEM_TYPES.ARMOR, icon: Shirt, cost: 800, label: 'Mystery Armor' },
  { type: ITEM_TYPES.HELM, icon: Skull, cost: 600, label: 'Mystery Mask' },
  { type: ITEM_TYPES.OFFHAND, icon: Book, cost: 400, label: 'Mystery Tome' },
  { type: ITEM_TYPES.ACCESSORY, icon: Circle, cost: 300, label: 'Mystery Relic' },
  { type: ITEM_TYPES.ACCESSORY, icon: Flame, cost: 1200, label: 'Mystery Arcana' },
];

/**
 * --- HELPERS ---
 */
const generateRandomItem = (baseType) => {
  const isRare = Math.random() > 0.7;
  const isEvolved = Math.random() > 0.95;
  
  let rarity = RARITY.NORMAL;
  if (isRare) rarity = RARITY.RELIC;
  if (isEvolved) rarity = RARITY.EVOLVED;

  const names = {
    [ITEM_TYPES.WEAPON]: ['Whip', 'Wand', 'Knife', 'Axe', 'Cross'],
    [ITEM_TYPES.ARMOR]: ['Armor', 'Robe', 'Plate', 'Suit'],
    [ITEM_TYPES.HELM]: ['Mask', 'Visor', 'Hood'],
    [ITEM_TYPES.OFFHAND]: ['Tome', 'Orb', 'Shield'],
    [ITEM_TYPES.ACCESSORY]: ['Ring', 'Clover', 'Gauntlet', 'Wings', 'Attractorb'],
  };

  const pool = names[baseType] || ['Item'];
  const name = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: `rnd-${Date.now()}-${Math.random()}`,
    name: `${rarity !== RARITY.NORMAL ? 'Golden ' : ''}${name}`,
    type: baseType,
    rarity: rarity,
    icon: GAMBLE_STOCK.find(s => s.type === baseType).icon,
    stats: [
      { label: 'Random Stat', color: 'blue' },
      isRare ? { label: 'Bonus Luck', color: 'yellow' } : null
    ].filter(Boolean),
    baseStats: { label: 'Gambled', color: 'white' }
  };
};

/**
 * --- COMPONENTS ---
 */

const MobileItemDetail = ({ item, onClose, isGamble, onBuy }) => {
  if (!item) return null;
  
  const showBaseStats = item.baseStats && item.baseStats.label !== item.rarity?.label;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] bg-[#1a0f1f] border-t-2 border-[#6d28d9] shadow-[0_-5px_20px_rgba(0,0,0,0.8)] p-4 animate-slide-up pb-8 font-serif">
      <div className="flex justify-between items-start mb-2">
         <h3 className={`text-xl font-bold uppercase ${isGamble ? 'text-yellow-400' : item.rarity?.color}`}>
            {isGamble ? 'Unidentified' : item.name}
         </h3>
         <button onClick={onClose} className="p-2 bg-neutral-800 rounded-full text-white"><X size={16} /></button>
      </div>

      {isGamble ? (
        <>
          <p className="text-neutral-400 mb-4 italic">The properties of this item are unknown.</p>
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl mb-4">
            <Coins size={20} />
            <span>{item.cost}</span>
          </div>
          <button 
            onClick={onBuy}
            className="w-full py-3 bg-red-900 border-2 border-red-600 text-white font-creepster text-xl tracking-widest hover:bg-red-800 active:scale-95 transition-all"
          >
            GAMBLE
          </button>
        </>
      ) : (
        <>
          <p className={`text-sm ${item.rarity.label === 'Base' ? 'text-neutral-400' : item.rarity.color} mb-2`}>
            {item.rarity.label} {item.type.toUpperCase()}
          </p>
          {showBaseStats && (
            <p className="text-white text-sm mb-2 font-bold">{item.baseStats.label}</p>
          )}
          <div className="space-y-1">
            {item.stats.map((stat, idx) => (
              <p key={idx} className={`text-sm font-bold`} style={{ color: stat.color === 'red' ? '#ef4444' : stat.color === 'green' ? '#22c55e' : stat.color === 'blue' ? '#3b82f6' : stat.color === 'yellow' ? '#eab308' : '#a3a3a3' }}>
                {stat.label}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const DesktopTooltip = ({ item, position, isGamble }) => {
  if (!item) return null;

  return (
    <div 
      className="fixed z-[100] w-64 bg-[#1a0f1f] border-2 border-[#6d28d9] p-3 text-center shadow-xl font-serif pointer-events-none"
      style={{ left: position.x + 15, top: position.y + 15 }}
    >
      {isGamble ? (
        <>
          <div className="font-bold text-lg mb-1 uppercase tracking-widest text-yellow-400">Unidentified</div>
          <div className="text-xs uppercase mb-2 text-neutral-400">{item.label}</div>
          <div className="text-white text-sm mb-2 border-t border-white/10 pt-2 flex items-center justify-center gap-1">
             <Coins size={14} className="text-yellow-400" />
             <span className="text-yellow-400">{item.cost} Gold</span>
          </div>
        </>
      ) : (
        <>
          <div className={`font-bold text-lg mb-1 uppercase tracking-widest ${item.rarity.color}`}>{item.name}</div>
          <div className={`text-xs uppercase mb-2 ${item.rarity.color}`}>
            {item.rarity.label} {item.type}
          </div>
          {item.baseStats && item.baseStats.label !== item.rarity.label && (
            <div className="text-white text-sm mb-2 border-b border-white/10 pb-2">{item.baseStats.label}</div>
          )}
          <div className="space-y-1">
            {item.stats.map((stat, idx) => (
              <div key={idx} className="text-sm font-bold shadow-black drop-shadow-md" 
                   style={{ color: stat.color === 'red' ? '#ef4444' : stat.color === 'green' ? '#22c55e' : stat.color === 'blue' ? '#3b82f6' : stat.color === 'yellow' ? '#eab308' : stat.color === 'cyan' ? '#06b6d4' : '#d4d4d4' }}>
                {stat.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ItemIcon = ({ item, isDragging, isGamble }) => {
  const Icon = item.icon;
  // If gambling, use a neutral color until revealed
  const colorClass = isGamble ? 'text-neutral-500' : item.rarity.color;
  const borderClass = isGamble ? 'border-neutral-700' : item.rarity.border;

  return (
    <div className={`
      w-full h-full flex items-center justify-center relative
      ${isDragging ? 'opacity-30' : 'opacity-100'}
    `}>
      <Icon 
        size={24} 
        className={`${colorClass} drop-shadow-md filter`} 
        style={{ filter: isGamble ? 'grayscale(0.8)' : 'drop-shadow(0px 0px 4px rgba(0,0,0,1))' }}
      />
      {/* Rarity Border */}
      <div className={`absolute inset-0 border-2 ${borderClass} opacity-50 rounded-sm pointer-events-none`}></div>
      
      {/* Gamble Question Mark Overlay */}
      {isGamble && (
        <div className="absolute -top-1 -right-1 bg-[#1a0f1f] rounded-full border border-neutral-600">
           <HelpCircle size={14} className="text-yellow-400" />
        </div>
      )}
    </div>
  );
};

export default function VampireSurvivorsInventory() {
  const [inventory, setInventory] = useState(Array(40).fill(null));
  const [equipment, setEquipment] = useState({
    head: null, accessory1: null, body: null, mainHand: null, 
    offHand: null, accessory5: null, accessory2: null, accessory3: null, 
    accessory4: null, accessory6: null,
  });
  
  const [gold, setGold] = useState(42069);
  const [view, setView] = useState('character'); // 'character' | 'gamble'

  const [selectedItem, setSelectedItem] = useState(null); // { item, type, id, isGamble: bool }
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [lastTap, setLastTap] = useState({ time: 0, type: null, id: null });

  const [dragState, setDragState] = useState({
    isDragging: false, item: null, sourceType: null, sourceId: null, x: 0, y: 0, startX: 0, startY: 0
  });

  useEffect(() => {
    const newInv = [...inventory];
    INITIAL_ITEMS.forEach((item, idx) => {
      if (idx < newInv.length) newInv[idx] = item;
    });
    setInventory(newInv);
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- LOGIC: GAMBLE ---

  const handleBuyItem = (gambleItem) => {
    if (gold < gambleItem.cost) {
      alert("Not enough gold!"); // Simple feedback
      return;
    }

    // Find empty slot
    const emptyIdx = inventory.findIndex(i => i === null);
    if (emptyIdx === -1) {
      alert("Inventory full!");
      return;
    }

    const newItem = generateRandomItem(gambleItem.type);
    
    // Update State
    setGold(prev => prev - gambleItem.cost);
    setInventory(prev => {
      const next = [...prev];
      next[emptyIdx] = newItem;
      return next;
    });
    setSelectedItem(null);
  };

  // --- LOGIC: INVENTORY ---

  const getItemAt = (type, id) => {
    if (type === 'inventory') return inventory[id];
    if (type === 'equipment') return equipment[id];
    return null;
  };

  const setItemAt = (type, id, item) => {
    if (type === 'inventory') {
      setInventory(prev => {
        const next = [...prev];
        next[id] = item;
        return next;
      });
    } else {
      setEquipment(prev => ({ ...prev, [id]: item }));
    }
  };

  const moveItem = (sourceType, sourceId, targetType, targetId) => {
    const sourceItem = getItemAt(sourceType, sourceId);
    const targetItem = getItemAt(targetType, targetId);

    if (targetType === 'equipment') {
      const allowed = EQUIPMENT_SLOTS[targetId];
      if (!allowed || !allowed.includes(sourceItem.type)) return false; 
    }

    setItemAt(sourceType, sourceId, targetItem);
    setItemAt(targetType, targetId, sourceItem);
    setSelectedItem(null);
    return true;
  };

  const handleAutoEquip = (type, id) => {
    if (type === 'inventory') {
      const item = inventory[id];
      if (!item) return;
      const compatibleSlots = Object.keys(EQUIPMENT_SLOTS).filter(slotKey => {
        return EQUIPMENT_SLOTS[slotKey].includes(item.type);
      });
      if (compatibleSlots.length === 0) return;
      const emptySlot = compatibleSlots.find(slotKey => equipment[slotKey] === null);
      if (emptySlot) moveItem('inventory', id, 'equipment', emptySlot);
      else moveItem('inventory', id, 'equipment', compatibleSlots[0]);

    } else if (type === 'equipment') {
      const item = equipment[id];
      if (!item) return;
      const emptyInvIndex = inventory.findIndex(i => i === null);
      if (emptyInvIndex !== -1) moveItem('equipment', id, 'inventory', emptyInvIndex);
    }
  };

  // --- INTERACTION ---

  const handlePointerDown = (e, type, id, gambleItem = null) => {
    if (e.button !== 0 && e.button !== undefined) return;

    // Handle Gamble Click
    if (type === 'gamble') {
       if (isMobile) {
         setSelectedItem({ item: gambleItem, isGamble: true });
       } else {
         handleBuyItem(gambleItem);
       }
       return;
    }

    const item = getItemAt(type, id);

    // Double Tap
    const now = Date.now();
    if (now - lastTap.time < 300 && lastTap.type === type && lastTap.id === id) {
      handleAutoEquip(type, id);
      setLastTap({ time: 0, type: null, id: null });
      return;
    }
    setLastTap({ time: now, type, id });

    if (!item) {
      if (selectedItem && !selectedItem.isGamble) {
         moveItem(selectedItem.sourceType, selectedItem.sourceId, type, id);
      }
      return;
    }
    
    setDragState({
      isDragging: false, item, sourceType: type, sourceId: id, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY
    });
    setSelectedItem({ item, sourceType: type, sourceId: id, isGamble: false });
  };

  const handlePointerMove = (e) => {
    if (!dragState.item) {
      setCursorPos({ x: e.clientX, y: e.clientY });
      return;
    }
    const dx = Math.abs(e.clientX - dragState.startX);
    const dy = Math.abs(e.clientY - dragState.startY);
    if (!dragState.isDragging && (dx > 5 || dy > 5)) {
       setDragState(prev => ({ ...prev, isDragging: true }));
    }
    if (dragState.isDragging) {
      setDragState(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
  };

  const handlePointerUp = (e) => {
    if (dragState.isDragging) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const slotElement = elements.find(el => el.dataset.slotId);
      if (slotElement) {
        const targetType = slotElement.dataset.slotType;
        const targetId = slotElement.dataset.slotId;
        const finalTargetId = targetType === 'inventory' ? parseInt(targetId) : targetId;
        moveItem(dragState.sourceType, dragState.sourceId, targetType, finalTargetId);
      }
    }
    setDragState(prev => ({ ...prev, isDragging: false, item: null }));
  };

  const handlePointerCancel = () => {
    setDragState(prev => ({ ...prev, isDragging: false, item: null }));
  };

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    const preventScroll = (e) => { if (dragState.isDragging) e.preventDefault(); };
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [dragState.isDragging]);

  // --- SUB-COMPONENTS ---

  const Slot = ({ type, id, allowedIcon: AllowedIcon, className }) => {
    const item = getItemAt(type, id);
    const isSelected = selectedItem && selectedItem.sourceType === type && selectedItem.sourceId === id;
    
    // Highlight logic
    const activeItem = dragState.item || (selectedItem && !selectedItem.isGamble ? selectedItem.item : null);
    let isCompatible = false;
    
    if (activeItem) {
      const isSelf = (dragState.isDragging && dragState.sourceType === type && dragState.sourceId === id) ||
                     (selectedItem && selectedItem.sourceType === type && selectedItem.sourceId === id);
      if (!isSelf) {
        if (type === 'inventory') isCompatible = true; 
        else {
          const allowed = EQUIPMENT_SLOTS[id];
          isCompatible = allowed && allowed.includes(activeItem.type);
        }
      }
    }

    return (
      <div
        data-slot-type={type}
        data-slot-id={id}
        onPointerDown={(e) => handlePointerDown(e, type, id)}
        className={`
          relative flex items-center justify-center 
          border-2 transition-all duration-150
          ${className}
          ${isSelected ? 'border-purple-400 bg-purple-900/60 shadow-[0_0_15px_rgba(168,85,247,0.5)] z-20' : ''}
          ${!isSelected && isCompatible && type === 'equipment' ? 'border-green-500 bg-green-900/30 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.3)]' : ''}
          ${!isSelected && isCompatible && type === 'inventory' ? 'border-neutral-500 bg-white/5' : ''}
          ${!isSelected && !isCompatible ? 'border-[#444] bg-black/40' : ''}
          ${!item && AllowedIcon ? 'text-neutral-700' : ''}
          touch-pan-y select-none
        `}
      >
        {!item && AllowedIcon && <AllowedIcon size={20} className="opacity-40" />}
        {item && <ItemIcon item={item} isDragging={dragState.item === item && dragState.isDragging} />}
      </div>
    );
  };

  const GambleSlot = ({ gambleItem }) => {
    // If mobile, checking selection. If desktop, hover handled by tooltip
    const isSelected = selectedItem && selectedItem.isGamble && selectedItem.item === gambleItem;

    return (
      <div 
        onPointerDown={(e) => handlePointerDown(e, 'gamble', null, gambleItem)}
        className={`
           relative w-16 h-16 bg-[#0f0514] border-2 cursor-pointer transition-all
           flex items-center justify-center hover:bg-white/5
           ${isSelected ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-[#444]'}
        `}
        onMouseEnter={() => !isMobile && setCursorPos({ x: cursorPos.x, y: cursorPos.y })} // Trigger tooltip update
      >
        <ItemIcon item={gambleItem} isGamble={true} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#120816] text-neutral-200 font-sans selection:bg-purple-900 flex flex-col overflow-hidden">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Creepster&family=VT323&display=swap');
        .font-creepster { font-family: 'Creepster', cursive; }
        .font-pixel { font-family: 'VT323', monospace; }
        .font-serif { font-family: 'VT323', monospace; font-size: 1.1rem; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>

      {/* --- TOOLTIPS --- */}
      {isMobile && selectedItem && (
        <MobileItemDetail 
          item={selectedItem.item} 
          isGamble={selectedItem.isGamble}
          onBuy={() => handleBuyItem(selectedItem.item)}
          onClose={() => setSelectedItem(null)} 
        />
      )}
      {!isMobile && (
        <DesktopTooltip 
          item={selectedItem?.item || dragState.item || (document.querySelector(':hover')?.className?.includes('cursor-pointer') ? null : null)} 
          position={cursorPos} 
        />
      )}
      
      {/* Hacky way to show tooltip on hover for gamble items since we used custom pointer events for logic */}
      {!isMobile && !dragState.isDragging && (
         <div className="fixed inset-0 pointer-events-none z-[50]">
            {/* We render tooltip based on hovered element manually detected via state in a real app, 
                but for this demo we'll use a simpler approach:
                Pass hover state from GambleSlots up? Or just trust the hover logic above?
                Actually, let's reuse the existing hoveredItem pattern if we were dragging, 
                but here we just duplicate the tooltip logic inside the map for simplicity 
                or use a state for 'hoveredGambleItem'.
            */}
         </div>
      )}
      
      {/* We need a dedicated hover state for gamble items on desktop because they aren't 'selected' or 'dragged' */}
      {!isMobile && (
        <DesktopGambleHoverListener setCursorPos={setCursorPos} />
      )}

      {/* --- GHOST DRAG ITEM --- */}
      {dragState.isDragging && dragState.item && (
        <div 
          className="fixed pointer-events-none z-[9999] opacity-80"
          style={{ left: dragState.x, top: dragState.y, transform: 'translate(-50%, -50%)', width: '48px', height: '48px' }}
        >
          <ItemIcon item={dragState.item} isDragging={false} />
        </div>
      )}

      {/* --- MAIN LAYOUT --- */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full lg:p-8 gap-4 lg:gap-8">
        
        {/* === LEFT PANEL: SWITCHABLE === */}
        <div className="flex-none lg:w-[420px] bg-[#1e1024] border-2 border-[#581c87] flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          
          {/* HEADER WITH TABS */}
          <div className="bg-[#2e1065] flex items-center border-b border-[#581c87]">
             <button 
                onClick={() => setView('character')}
                className={`flex-1 p-3 flex items-center justify-center gap-2 font-pixel text-xl transition-colors
                  ${view === 'character' ? 'bg-[#4c1d95] text-white' : 'text-neutral-400 hover:bg-[#3b0764]'}
                `}
             >
                <User size={18} /> CHARACTER
             </button>
             <div className="w-[1px] h-8 bg-[#581c87]"></div>
             <button 
                onClick={() => setView('gamble')}
                className={`flex-1 p-3 flex items-center justify-center gap-2 font-pixel text-xl transition-colors
                  ${view === 'gamble' ? 'bg-[#4c1d95] text-yellow-400' : 'text-neutral-400 hover:bg-[#3b0764]'}
                `}
             >
                <Store size={18} /> MERCHANT
             </button>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] p-4 flex flex-col items-center justify-center min-h-[400px]">
            
            {view === 'character' ? (
              /* --- CHARACTER VIEW --- */
              <>
                <div className="absolute top-16 right-4 text-right">
                   <h2 className="text-red-500 font-creepster text-2xl tracking-widest drop-shadow-[0_2px_0_rgba(0,0,0,1)]">ANTONIO</h2>
                   <div className="text-lg text-neutral-300 font-pixel">LVL 99</div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                   <Ghost size={200} />
                </div>

                <div className="relative z-10 w-full max-w-[320px] flex flex-col gap-4 py-4 mt-8">
                  {/* Row 1: Helm */}
                  <div className="flex justify-center">
                    <Slot type="equipment" id="head" allowedIcon={Skull} className="w-16 h-16 rounded-sm bg-[#0f0514]/80" />
                  </div>
                  {/* Row 2: Weapons & Body */}
                  <div className="flex justify-between items-start">
                     <div className="flex flex-col items-center gap-1">
                       <span className="text-xs font-pixel text-red-400">WEAPON</span>
                       <Slot type="equipment" id="mainHand" allowedIcon={Sword} className="w-20 h-24 rounded-sm bg-[#0f0514]/80 border-red-900/40" />
                     </div>
                     <div className="flex flex-col items-center gap-2 mt-2">
                        <Slot type="equipment" id="accessory1" allowedIcon={Circle} className="w-10 h-10 rounded-full border-[#444] bg-[#0f0514]/80" />
                        <Slot type="equipment" id="body" allowedIcon={Shirt} className="w-20 h-24 rounded-sm bg-[#0f0514]/80" />
                     </div>
                     <div className="flex flex-col items-center gap-1">
                       <span className="text-xs font-pixel text-blue-400">OFFHAND</span>
                       <Slot type="equipment" id="offHand" allowedIcon={Book} className="w-20 h-24 rounded-sm bg-[#0f0514]/80 border-blue-900/40" />
                     </div>
                  </div>
                  {/* Row 3: Accessories */}
                  <div className="flex justify-between items-center px-2">
                     <Slot type="equipment" id="accessory5" allowedIcon={Circle} className="w-16 h-16 rounded-full bg-[#0f0514]/80" />
                     <div className="flex gap-2">
                        <Slot type="equipment" id="accessory2" allowedIcon={Circle} className="w-8 h-8 rounded-full bg-[#0f0514]/80" />
                        <Slot type="equipment" id="accessory3" allowedIcon={Circle} className="w-8 h-8 rounded-full bg-[#0f0514]/80" />
                        <Slot type="equipment" id="accessory4" allowedIcon={Circle} className="w-8 h-8 rounded-full bg-[#0f0514]/80" />
                     </div>
                     <Slot type="equipment" id="accessory6" allowedIcon={Circle} className="w-16 h-16 rounded-full bg-[#0f0514]/80" />
                  </div>
                </div>
              </>
            ) : (
              /* --- MERCHANT/GAMBLE VIEW --- */
              <div className="w-full h-full flex flex-col">
                 <div className="text-center mb-6">
                    <h3 className="font-creepster text-yellow-500 text-3xl tracking-widest drop-shadow-md">Gheed's Wagon</h3>
                    <p className="font-pixel text-neutral-400 text-sm">"I promise... no refunds."</p>
                 </div>
                 
                 <div className="flex-1 grid grid-cols-3 gap-6 p-4 place-items-center bg-black/20 rounded-lg border border-[#333]">
                    {GAMBLE_STOCK.map((item, idx) => (
                      <HoverGambleWrapper key={idx} item={item}>
                        <GambleSlot gambleItem={item} />
                      </HoverGambleWrapper>
                    ))}
                 </div>

                 <div className="mt-4 p-3 bg-black/40 border border-[#333] rounded text-center">
                    <p className="text-xs text-neutral-500 font-pixel">Click to gamble (Gold will be deducted)</p>
                 </div>
              </div>
            )}

          </div>
        </div>

        {/* === RIGHT: COLLECTION (INVENTORY) === */}
        <div className="flex-1 bg-[#1e1024] border-2 border-[#581c87] flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.5)] min-h-[400px]">
          <div className="bg-[#2e1065] p-3 border-b border-[#581c87] flex justify-between">
            <h2 className="text-neutral-300 font-creepster text-2xl tracking-widest drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">COLLECTION</h2>
            <div className="flex items-center gap-2 text-yellow-400 text-xl font-pixel">
               <span>{gold.toLocaleString()}</span>
               <span className="text-sm">GOLD</span>
            </div>
          </div>

          <div className="flex-1 bg-[#120816] p-4 flex flex-col items-center overflow-y-auto">
            <div className="bg-[#0a050c] p-2 border border-[#333] rounded shadow-inner">
               <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
                 {inventory.map((_, index) => (
                   <Slot key={index} type="inventory" id={index} className="w-12 h-12 md:w-14 md:h-14 bg-[#160b1b]" />
                 ))}
               </div>
            </div>
          </div>

          {/* STATS FOOTER */}
          <div className="p-3 border-t border-[#581c87] bg-[#1a0b21] grid grid-cols-4 gap-4 text-sm font-pixel text-neutral-400">
             <div className="flex flex-col items-center"><span className="text-red-500 text-lg">MIGHT</span><span>+145%</span></div>
             <div className="flex flex-col items-center"><span className="text-blue-400 text-lg">COOLDOWN</span><span>-35%</span></div>
             <div className="flex flex-col items-center"><span className="text-green-400 text-lg">AREA</span><span>+60%</span></div>
             <div className="flex flex-col items-center"><span className="text-yellow-400 text-lg">LUCK</span><span>+20%</span></div>
             <div className="flex flex-col items-center"><span className="text-purple-400 text-lg">SPEED</span><span>+50%</span></div>
             <div className="flex flex-col items-center"><span className="text-cyan-400 text-lg">AMOUNT</span><span>+1</span></div>
             <div className="flex flex-col items-center"><span className="text-orange-400 text-lg">GREED</span><span>+100%</span></div>
             <div className="flex flex-col items-center"><span className="text-pink-400 text-lg">REVIVAL</span><span>+1</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper to handle Hover state for Gamble Items on Desktop
const HoverGambleWrapper = ({ children, item }) => {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({x:0, y:0});

  const handleMove = (e) => {
    setPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div 
        onMouseEnter={() => setHover(true)} 
        onMouseLeave={() => setHover(false)}
        onMouseMove={handleMove}
      >
        {children}
      </div>
      {hover && !('ontouchstart' in window) && (
        <DesktopTooltip item={item} position={pos} isGamble={true} />
      )}
    </>
  );
};

// Component to handle global hover logic for regular items if needed
const DesktopGambleHoverListener = ({ setCursorPos }) => {
   useEffect(() => {
     const handleMove = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
     window.addEventListener('mousemove', handleMove);
     return () => window.removeEventListener('mousemove', handleMove);
   }, []);
   return null;
}
```

---

### Phase 5: The Gambler (Trader)
Stretch feature after core phases (post Phase 8).

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
| Corrupted Item | 1000 | Rare: 40%, Legendary: 10%, Corrupted: 50% |

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

Corrupted items are gambler-only drops and use Legendary affix count rules plus one drawback affix.

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
| Cooldown Reduction % | 10% | 18% | 28% | 40% | 55% |
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

Corrupted items are gambler-only and do not appear in normal drops.

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
Each boss drops relics from their specific pool. Map selection defaults to the current character's class; players can opt into off-class farming by selecting another class's boss. Relic weights apply within the pool. As new classes are added, attach their relic pool to an existing boss or introduce a new boss.

| Boss | Theme | Relic Pool | Classes |
|------|-------|------------|---------|
| **Dragon Lord** | Castle/Dungeon | Arcane Die, Grimoire of Chains, Warding Screen, Familiar Figurine, Critical Convergence | Wizard |
| **Giant Custodian Bot** | Mall/Food Court | Consecrated Banner, Reliquary Key, Sanctified Flail, Paladin's Ring, Aegis Oath | Paladin |
| **Security Chief** | Mall Security Office | Chain Smite, Royal Crest, Squire's Banner, Battle Rations, Knight's Rest | Knight |
| **Street Gang Leader** | Parking Lot | Shadow Chakram, Nightstep Boots, Venom Vial, Cloak of Knives, Second Shadow | Rogue |
| **Rat King** | Kitchen/Backrooms | Cinder Brand, Pyromancer's Hood, Inferno Core, Ember Feast, Forbidden Formula | Pyromancer |
| **Street Posse** | Arcade | Blood Howl, War Cry, Rampage Greaves, Rage Draught, Bloodsmoke | Berserker |

**Drop logic:**
- Boss always drops 1 relic from their pool using the boss-weighted table (Rare/Chase boosted).
- Boss also drops 2-3 normal items (Rare+ + 2-3 Magic baseline).
- With map modifiers: can drop 2+ relics (extra rolls from the same pool).
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
| Modifiers | Rarity Boost | Bonus Relic Roll (Boss) | Boss Drops |
|-----------|--------------|--------------------------|------------|
| 0 | Base | 0% | 1 relic + 2-3 items |
| 1 | +1 tier | 20% | 1-2 relics |
| 2+ | +2 tiers | 50% | 2-3 relics |

#### Map Selection UI
- Grid of available maps/bosses
- Defaults to current class; toggle to show other classes for alt farming
- Shows: boss name, relic pool, best modifier strategies
- Click map → select modifiers → start run

**Example flow:**
```
1. "I need Arcane Die for my Wizard"
2. Select Dragon Lord map (Wizard boss pool)
3. Add: Bloodlust + Chaos (50% bonus relic roll!)
4. Swap loadout: +%HP, Armor, Regen (survival focus)
5. Run → Extract with 2 relics!
6. "Got Arcane Die with 57% Fire Damage - nice!"
7. Repeat for god roll (60%)
```

**Milestone**: Players farm specific bosses for targeted relics; map modifiers create build diversity and endgame challenges.

---

## Affix Min/Max Gap Fix

### Problem Analysis

The `buildTierBrackets()` function creates affix ranges, but when consecutive tier values differ by 1, the `min` calculation rounds up to equal `max`, eliminating RNG.

**Current affix tiers with no variance**:
```
projectiles: [1, 2, 3, null, null]  →  All 3 tiers fixed
pierce:     [1, 2, 3, null, null]  →  All 3 tiers fixed
duration:   [1, 2, 3, 4, null]    →  All 4 tiers fixed
armor:      [1, 2, 4, null, null]  →  Tiers 1-2 fixed
```

**Code location**: `src/items/affixTables.ts:50-81`

### Proposed Solution

**Option A: Increase tier value gaps** (Recommended)
```typescript
const affixValues = {
  projectiles: [1, 3, 5, null, null],  // Was [1, 2, 3]
  pierce: [1, 3, 5, null, null],     // Was [1, 2, 3]
  duration: [1, 3, 5, 7, null],      // Was [1, 2, 3, 4]
  armor: [1, 3, 6, null, null],      // Was [1, 2, 4]
}
```

**Benefits**:
- Simple data change, no code changes
- Creates meaningful chase (T1 projectiles=1, T3=5 is 400% increase)
- Clear progression between tiers

**Option B: Adjust min calculation formula**
```typescript
// Current: min = round((prev + step) * factor)
// Proposed: min = round((prev + (max - prev) * 0.4))
// Example for T2 with max=2, prev=1:
// min = round((1 + (2 - 1) * 0.4)) = round(1.4) = 1
// Range: 1-2 (50% variance)
```

**Benefits**:
- Keeps tier values small/integers
- Adds variance without power creep
- More granular rolling

**Recommendation**: Use Option A for projectiles/pierce/duration (they should scale dramatically), Option B for armor (keep values low).

### Impact Assessment

**Current state** (bad):
- +Projectiles always exact value by tier
- No "god roll" chase
- Relics with "2-4 Pierce" have same visual impact as fixed 3 Pierce

**Fixed state** (good):
- +1 Projectiles T1 → +4-5 Projectiles T3 (chase for perfect rolls)
- Same Pierce values but visible range in tooltips
- Relics feel more impactful with wider implicit ranges

### Implementation Steps

1. Update `affixValues` in `src/items/affixTables.ts`
2. Run tests to verify `buildTierBrackets()` creates ranges
3. Update tooltips to show ranges: "+52% Fire Damage (40-60)"
4. Balance check: Test with high-tier affixes to ensure power levels aren't broken

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

---

## Implementation Status & Gaps

### ✅ Implemented (Phase 1-4)
- Item generation with rarity rolls and affix counts
- Random affix selection from item type pools
- Tier rolling with min/max ranges
- Stash system (200 slots)
- Loadout system (7 slots including relic slot)
- Veiled item drops from enemies
- Basic item tooltips
- Save/load persistence

### ❌ Critical Gaps

#### Relic System (MASSIVE GAP)
**Current state**: Relics are just a differently-named random item type with no special behavior.

**Missing components**:

1. **No `RelicDefinition` data structure**
   - Need interface: `{ id, name, classId, icon, weightTier, uniqueEffects, implicits }`
   - Need 6 classes × 5 relics = 30 relic definitions
   - Relic effect triggers not implemented (onHit, onKill, passive, onPickup, onTimer, onExtract)

2. **No class-specific filtering**
   - Relics currently can be equipped by any character
   - Need: `relic.classId === player.selectedCharacter.id`
   - Need: Class-specific relic pools in data

3. **No weight tier system for relics**
   - Currently uses normal rarity (common/magic/rare/legendary)
   - Design requires: Common/Uncommon/Rare/Chase weights (100/40/15/5)
   - Boss bonus: Rare/Chase weights ×2

4. **No unique effect system**
   - Design: Fixed effects + random implicit stat rolls
   - Current: Fully random affixes (no fixed effects at all)
   - Need: Effect handlers in game loop (check triggers, apply effects)

5. **No implicit stat rolling**
   - Design: Each relic has 2-3 fixed implicit types with min-max ranges
   - Current: Random affix selection from pool
   - Need: `RolledImplicits: { type, value, min, max }[]` on relic instances

6. **Relic drop logic is placeholder**
   - Current: Only drops when `debugLootBoost` is true with 10% chance
   - Design: 0.1% (basic), 2% (elite), boss-specific pools
   - Missing: Class attunement system (which class's relics drop?)

7. **No boss-specific relic pools**
   - Phase 7 plan: Each boss has specific relic pool for their class
   - Missing: Boss definitions, relic pool mapping, map selection UI
   - Missing: Map modifiers that boost relic drop rates

#### Affix System Issues

1. **12/72 affix tiers have no RNG**
   - `projectiles`: All 3 tiers fixed (1, 2, 3)
   - `pierce`: All 3 tiers fixed (1, 2, 3)
   - `duration`: All 4 tiers fixed (1, 2, 3, 4)
   - `armor`: Tiers 1-2 fixed (1, 2)
   - Root cause: `buildTierBrackets()` rounds min to equal max when gap is 1
   - Impact: No chase for perfect rolls on these stats

**Technical breakdown**:
```typescript
// Current affix values:
projectiles: [1, 2, 3, null, null]
pierce: [1, 2, 3, null, null]
duration: [1, 2, 3, 4, null]

// buildTierBrackets() calculation for Tier 2 (value=2):
// min = round((1 + 1) * 1) = 2 = max (NO RANGE!)
```

2. **Fix options**:
   - Increase tier value gaps: projectiles: [1, 3, 5] instead of [1, 2, 3]
   - Adjust min calculation: use `min = prev + (max - prev) * 0.4` instead of `+1`
   - Accept deterministic: Some affixes (projectiles, duration) are intentionally fixed per tier

#### Missing Systems

1. **No extraction zones** - Design has 5min and 10min extraction triggers
2. **No secure slot** - Design has Tarkov-style slot for protecting one item
3. **No gambler merchant** - Phase 5 stretch feature
4. **No crafting/scrap** - Phase 6 stretch feature
5. **No map modifiers** - Phase 7 endgame feature
6. **No boss fights** - Phase 7 endgame feature
7. **No first-run guidance** - Phase 0 onboarding feature
8. **No starter gear** - Phase 0 feature

### Implementation Priority

**HIGH PRIORITY** (Core mechanics broken):
1. Implement proper relic data structure and class-specific pools
2. Implement unique effect system with triggers
3. Fix affix min/max gaps for projectiles/pierce/duration
4. Implement proper relic drop rates (0.1%/2%) without debug flag

---

## Relic Implementation Plan

### Phase R1: Core Relic Data (1-2 days)
**Files to create**:
- `src/data/relics.ts` - All 30 relic definitions
- `src/types/relics.ts` - Relic-specific types

**Data structure**:
```typescript
export interface RelicDefinition {
  id: string;
  name: string;
  classId: string;
  icon: string;
  weightTier: 'common' | 'uncommon' | 'rare' | 'chase';
  uniqueEffects: RelicEffect[];
  implicits: Array<{
    type: AffixType;
    min: number;
    max: number;
    isPercent?: boolean;
  }>;
}

export type RelicTrigger =
  | 'passive'
  | 'onHit'
  | 'onKill'
  | 'onPickup'
  | 'onTimer'
  | 'onExtract';

export interface RelicEffect {
  id: string;
  name: string;
  description: string;
  trigger: RelicTrigger;
  value?: number;  // For numeric effects
  duration?: number;  // For timed effects
}
```

**Wizard relics** (5 total):
- Arcane Die (chase): 5% chance for 10x damage
- Grimoire of Chains (common): Fireballs chain to 3 enemies
- Warding Screen (rare): +100% luck, -20% damage
- Familiar Figurine (common): Summons dragon ally
- Critical Convergence (uncommon): Crits double projectile count

Repeat for Paladin, Rogue, Knight, Pyromancer, Berserker (25 more relics).

### Phase R2: Relic Generation (1 day)
**Files to modify**:
- `src/items/generator.ts` - Add `generateRelic(classId)` method

**Changes**:
1. Filter relic pool by `classId`
2. Weighted random selection from pool (using weight tiers)
3. Apply boss bonus (Rare/Chase ×2 weights) if boss drop
4. Roll each implicit's value within min-max range
5. Return `RelicInstance` with fixed unique effects + rolled implicits

```typescript
export class ItemGenerator {
  static generateRelic(options: {
    classId: string;
    isBoss?: boolean;
    random?: () => number;
  }): Item {
    const pool = RELIC_POOLS[options.classId];
    const selectedRelic = this.rollWeightedRelic(pool, options.isBoss);
    const rolledImplicits = selectedRelic.implicits.map(implicit =>
      Utils.rand(implicit.min, implicit.max)
    );
    return {
      id: createId(),
      name: selectedRelic.name,
      type: 'relic',
      rarity: 'legendary',  // Display rarity; weightTier controls drop rate
      affixes: [],  // Relics use implicits instead
      rolledImplicits: rolledImplicits,
      uniqueEffects: selectedRelic.uniqueEffects
    };
  }
}
```

### Phase R3: Effect System (2-3 days)
**Files to create**:
- `src/systems/relicEffects.ts` - Effect handlers

**Architecture**:
```typescript
export class RelicEffectHandler {
  static onHit(player: Player, enemy: Enemy, relic: Item) {
    relic.uniqueEffects.forEach(effect => {
      if (effect.trigger === 'onHit') {
        // Apply effect
        if (effect.id === 'arcane_die') {
          if (Math.random() < 0.05) {
            const hitDamage = player.dmgMult;  // Placeholder for current hit damage
            enemy.hp -= hitDamage * 10;  // 10x damage
          }
        }
      }
    });
  }

  static passive(player: Player, relic: Item) {
    // Apply passive buffs (luck, etc.)
    relic.uniqueEffects.forEach(effect => {
      if (effect.id === 'warding_screen') {
        player.luck += effect.value ?? 100;
        player.damageMult -= 0.2;
      }
    });
  }
}
```

**Hook points in Game loop**:
- `Enemy.takeDamage()` → call `onHit()` for all equipped relics
- `Enemy.die()` → call `onKill()` for all equipped relics
- `Player.collectLoot()` → call `onPickup()` for all equipped relics
- `Game.update()` (timer) → call `onTimer()` for all equipped relics

### Phase R4: Class Filtering (1 day)
**Files to modify**:
- `src/items/loadout.ts` - Add `canEquipRelic(relic, character)` check
- `src/systems/loadoutUI.ts` - Show error if wrong class tries to equip

**Logic**:
```typescript
export function canEquipRelic(relic: Item, characterId: string): boolean {
  return relic.classId === characterId;
}

// In UI:
if (!canEquipRelic(item, selectedCharacter.id)) {
  showError(`This relic can only be equipped by ${CHARACTERS[item.classId].name}`);
}
```

### Phase R5: Drop Logic (1 day)
**Files to modify**:
- `src/game.ts` - Replace debug relic logic with proper drop rates
- `src/items/drops.ts` - Add `rollRelicDrop(enemyType, luck, classId)`

**Changes**:
```typescript
// In Enemy.die():
const relicDrop = rollRelicDrop(this.type, player.luck, player.characterId);
if (relicDrop) {
  const relic = ItemGenerator.generateRelic({
    classId: player.characterId,
    isBoss: this.type === 'boss'
  });
  this.game.loot.push(new Loot(this.x, this.y, 'orb', relic));
}
```

**Drop rates**:
- Basic: 0.1% × (1 + luck/100)
- Elite: 2% × (1 + luck/100) (additional drop, not replacing normal)
- Boss: Always drops 1 relic (plus 2-3 normal items)

### Phase R6: Tooltip Display (1 day)
**Files to modify**:
- `src/systems/ui.ts` - Update tooltip for relics

**Display format**:
```
┌─────────────────────────────────────────────────────────┐
│ Arcane Die                                LEGENDARY  │
│ ────────────────────────────────────────────────────── │
│ UNIQUE EFFECTS:                                     │
│ Fate Roll: 5% chance to deal 10x damage            │
│                                                     │
│ ROLLED IMPLICITS:                                   │
│ +52% Fire Damage (40-60)                           │
│ +3 Pierce (2-4)                                    │
│ +6% Crit Chance (3-7)                               │
│                                                     │
│ Can only be equipped by Wizard                        │
└─────────────────────────────────────────────────────────┘
```

**Total estimated time**: 6-8 days

**MEDIUM PRIORITY** (Planned but not started):
1. Extraction zones and secure slot
2. Boss-specific relic pools
3. Map selection and modifiers
4. First-run guidance and starter gear

**LOW PRIORITY** (Stretch features):
1. Gambler merchant and corrupted items
2. Crafting and rerolling
3. Set items and uniques
