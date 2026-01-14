# Game Systems Analysis: Missing vs Implemented (D2/PoE Inspired)

## Overview

Based on codebase review and documentation, here's a comprehensive breakdown of game systems inspired by Diablo 2 and Path of Exile, with completion estimates.

---

## Core Systems

### 1. Item System ⭐ 90% Complete

**Implemented:**
- ✅ Item types: weapon, helm, armor, accessory, relic, offhand
- ✅ Item rarities: common, magic, rare, legendary, corrupted
- ✅ Affix system: 25 affix types with 5 tiers
- ✅ Affix pools by item type (weapon, armor, helm, accessory, relic)
- ✅ Affix count by rarity (1-2 for magic, 3-4 for rare, 5-6 for legendary)
- ✅ Item generation with rarity weights and luck scaling
- ✅ Tier brackets with min-max roll ranges
- ✅ Prefix/suffix naming system
- ✅ Base items with tier scaling
- ✅ Item IDs and serialization

**Missing/Partial:**
- ⚠️ Offhand type missing from AFFIX_POOLS (diagnostic error in code)
- ⚠️ Relic implicit min-max rolls not implemented (currently no variance)

**Complexity:** Medium
- Data structure is solid and extensible
- Affix pools are comprehensive
- Weighted randomization is robust
- Minor bug fix needed for offhand pool

---

### 2. Loot System ⭐ 85% Complete

**Implemented:**
- ✅ Drop rates based on enemy type (basic 5%, bat 3%, elite 100%, boss always)
- ✅ Time scaling (+10% per minute, capped at +200%)
- ✅ Luck scaling
- ✅ Veiled items (unidentified until extraction)
- ✅ Loot orb spawning and collection
- ✅ Loot inventory tracking during runs
- ✅ Extraction zones (5min/10min triggers planned)
- ✅ Secure slot system (auto-safe, upgradeable)
- ✅ Extraction screen with reveal mechanic

**Missing/Planned:**
- ❌ Extraction zones not implemented in game loop
- ⚠️ Manual secure slot selection (currently auto-safe only)

**Complexity:** Medium
- Core mechanics are there
- Extraction system needs UI implementation
- Drop math is well-designed

---

### 3. Stash & Loadout ⭐ 90% Complete

**Implemented:**
- ✅ 200-slot stash with add/remove/swap operations
- ✅ 7-slot loadout (relic, weapon, helm, armor, 3 accessories)
- ✅ Drag-and-drop between stash and loadout
- ✅ Loadout stats calculation (ItemStats)
- ✅ Stat summary display (Might, Cooldown, Area, Luck, Speed, Projectiles)
- ✅ Class compatibility enforcement for relics
- ✅ Persistence to localStorage
- ✅ Tooltip system for item inspection
- ✅ Salvage mode for bulk deletion
- ✅ Bulk salvage buttons by rarity

**Missing:**
- ⚠️ Build templates/save-load functionality
- ⚠️ Item sorting/filtering

**Complexity:** Medium-High
- UI is sophisticated and functional
- Drag-drop works smoothly
- Quality of life features are minor

---

### 4. Shop & Economy ⭐ 80% Complete

**Implemented:**
- ✅ Gold currency and earning
- ✅ Shop with upgrades (damage, health, speed, magnet, safeSlots)
- ✅ Item shop with veiled/revealed items
- ✅ Gambler with corrupted items
- ✅ Selling system (convert items to gold at 40% rate)
- ✅ Bulk sell buttons by rarity
- ✅ Daily refresh timer
- ✅ Manual refresh option
- ✅ Item expiration system

**Missing:**
- ⚠️ Shop inventory persistence (items expire but tracking may need refinement)
- ⚠️ No buyback system (buy items back at reduced price)

**Complexity:** Low-Medium
- Economy is functional
- Risk/reward with gambler is solid

---

### 5. Relic System (Class Uniques) ⭐ 10% Complete

**Implemented:**
- ✅ Relic data structure
- ✅ 2 example relics implemented (Sunforge Core, Storm Quiver)
- ✅ Weight tiers (common/uncommon/rare/chase)
- ✅ Class-specific pools
- ✅ Relic drop logic (separate from normal items)
- ✅ Relic effect system (weapon modifiers, damage mult, cooldown mult, fireball merge)
- ✅ Relic equip validation (class-specific only)
- ✅ Tooltip formatting for relics

**Missing:**
- ❌ 23 more relics planned (5 per class, 6 classes × 5 = 30 total, 7 implemented)
- ❌ Boss-specific relic pools
- ❌ Implicit stat min-max rolling (currently no variance on rolls)
- ❌ Multiple unique effect types beyond weapon modifiers

**Complexity:** Medium-High
- Data structure exists
- Effect system needs expansion
- Each new relic requires:
  - Definition in relics.ts
  - Effect logic in relicEffects.ts (if new trigger type)
  - Integration in game.ts
  - Test coverage

---

### 6. Crafting System ⭐ 10% Complete

**Implemented:**
- ✅ Scrap system exists (salvage items for currency)
- ✅ Scrap values by rarity (10/50/200/1000/2500)
- ✅ Salvage operations in CraftingSystem

**Missing:**
- ❌ Reroll affix (replace with new random)
- ❌ Upgrade tier (increase affix tier with risk)
- ❌ Add affix slot (increase affix count with risk)
- ❌ Crafting UI in loadout
- ❌ Craft attempt tracking
- ❌ Cost helpers and validation

**Complexity:** Medium
- Infrastructure is 90% there (affix generation, stash, item manipulation)
- Need to add: operation methods, UI, confirmation modals
- Plan is fully detailed in `.opencode/plan/crafting_system.md`

---

### 7. Maps & Modifiers ⭐ 5% Complete

**Implemented:**
- ❌ None - entirely missing system

**Missing:**
- ❌ Map selection UI (choose different biome/theme)
- ❌ Map modifier definitions (Frenzied, Tanky, Swarm, Precision, Bloodlust, Economy, Chaos)
- ❌ Modifier stacking and combination system
- ❌ Boss-specific map assignments
- ❌ Modifier-based reward scaling
- ❌ Map difficulty/progression system

**Complexity:** High
- Requires:
  - Map data structure
  - Modifier system
  - Boss-map binding
  - Selection UI
  - Difficulty balancing

**Planned in PHASE1_LOOT_PLAN.md Phase 7** - Detailed design exists but no implementation

---

### 8. Boss System ⭐ 60% Complete

**Implemented:**
- ✅ Boss spawning (every 5 minutes)
- ✅ Boss entity type
- ✅ Boss loot (always Rare+ + 2-3 Magic)
- ✅ Boss-specific relic drops (planned but not implemented)
- ✅ Boss kill tracking
- ✅ Boss difficulty scaling over time

**Missing:**
- ❌ Unique boss mechanics/attacks per boss type
- ❌ Boss-specific relic pools (only generic boss bonus exists)
- ❌ Phased boss fights
- ❌ Boss patterns beyond "chaser with more HP"

**Complexity:** Medium-High
- Basic boss spawning works
- Boss variety needs design work
- Each boss needs: unique behaviors, relic pools, spawn patterns

---

### 9. Character Progression ⭐ 30% Complete

**Implemented:**
- ✅ 6 characters with unique weapons/ults
- ✅ Starting stat differences (hpMod, spdMod)
- ✅ Level-up system with random upgrade choices
- ✅ In-run weapon leveling
- ✅ Weapon switch during runs
- ✅ Ult system with charge and activation

**Missing:**
- ❌ Skill tree or passive progression
- ❌ Character level persistence between runs
- ❌ Character-specific mastery/tracking
- ❌ Unlockable abilities via progression
- ❌ Talent points or equivalent

**Complexity:** High
- Level-up exists but is temporary (resets each run)
- Need persistent progression system
- Design work needed for each character's unique progression

---

### 10. Skill/Ability System ⭐ 40% Complete

**Implemented:**
- ✅ 8 weapon types with different behaviors (nearest, facing, aura, arc, melee, chain, flicker, fireball)
- ✅ 6 unique ults
- ✅ Weapon leveling (damage ×1.3, cd ×0.9 per level)
- ✅ Level-up upgrade choices (3 random from 12 options)

**Missing:**
- ❌ Skill tree or ability points
- ❌ Active skills beyond weapon + ult
- ❌ Passive skill tiers
- ❌ Synergies between abilities
- ❌ Mastery systems (use ability more = unlock passive)

**Complexity:** High
- Weapon system is solid
- Level-up is basic (temporary upgrades)
- Deep progression needs new architecture

---

### 11. Difficulty & Scaling ⭐ 50% Complete

**Implemented:**
- ✅ Enemy spawn rate scaling over time
- ✅ Boss scaling (every 5 minutes)
- ✅ Damage scaling (weapons level, item bonuses)
- ✅ Elite spawns (every 60 seconds)

**Missing:**
- ❌ Enemy variety scaling (only basic/bat/elite/boss types)
- ❌ New enemy types at higher difficulties/time
- ❌ Map modifier difficulty scaling
- ❌ Explicit difficulty levels (Normal/Nightmare/Hell)
- ❌ Player-initiated difficulty

**Complexity:** Medium
- Time scaling works
- Missing: enemy type progression, difficulty tiers, modifier impact

---

### 12. Set Items ⭐ 5% Complete

**Implemented:**
- ❌ None - entirely missing

**Missing:**
- ❌ Set item data structure
- ❌ Set bonuses (2/3/4/5/6 piece)
- ❌ Set item generation logic
- ❌ Set completion tracking
- ❌ UI indication of equipped set pieces
- ❌ Set bonus stat application

**Complexity:** High
- Completely new system needed
- Design work: set themes, bonus design, balance
- Implementation: generation logic, stat calculation, UI

**Deferred in PHASE1_LOOT_PLAN.md** - Listed as post-MVP feature

---

### 13. Runes/Sockets ⭐ 5% Complete

**Implemented:**
- ❌ None - entirely missing

**Missing:**
- ❌ Socket system for items
- ❌ Rune generation
- ❌ Rune insertion UI
- ❌ Runeword system (combination bonuses)
- ❌ Socketable item base types

**Complexity:** High
- Major new system
- Requires item socket data, rune pools, runeword logic, UI

**Deferred in PHASE1_LOOT_PLAN.md** - Listed as post-MVP feature

---

### 14. Achievement System ⭐ 5% Complete

**Implemented:**
- ❌ None - entirely missing

**Missing:**
- ❌ Achievement definitions
- ❌ Achievement tracking UI
- ❌ Achievement rewards
- ❌ Achievement notification system
- ❌ Persistent achievement storage

**Complexity:** Medium
- New system but straightforward
- Design: achievement list, trigger conditions, rewards
- Implementation: tracking, UI, rewards

---

### 15. Build Templates/Loadouts ⭐ 5% Complete

**Implemented:**
- ❌ None - entirely missing

**Missing:**
- ❌ Save loadout templates per character
- ❌ Quick-load saved builds
- ❌ Build naming/editing
- ❌ Loadout count limit
- ❌ Template UI

**Complexity:** Low-Medium
- Data structure exists (loadout is current)
- Need: save/load multiple configs, UI

---

### 16. Visual Feedback ⭐ 60% Complete

**Implemented:**
- ✅ Damage numbers and floating text
- ✅ XP orbs
- ✅ Level-up screen
- ✅ Game over screen
- ✅ Loot orb sprites (colored by rarity)
- ✅ Tooltip hover effects
- ✅ Particle effects (explosions, trails)

**Missing:**
- ❌ Visual feedback for crafting (success/failure animations)
- ❌ Relic unique effect visuals
- ❌ Set completion glow/effects
- ❌ Achievement unlock animations
- ❌ Critical hit visual feedback
- ❌ Legendary drop flash/celebration

**Complexity:** Low-Medium
- Foundation exists
- Need specific animations for major events

---

## Priority Recommendations

### Tier 1 (Immediate - Core Game Loops)

**1. Complete Relic System** (Medium-High complexity)
- Implement 23 remaining relics
- Add implicit min-max rolling
- High impact on build diversity
- Well-defined in RELICS_TODO.md

**2. Implement Crafting** (Medium complexity)
- Full plan exists in crafting_system.md
- Core infrastructure is 90% ready
- Critical for item progression
- 5-7 day estimate

**3. Add Extraction Zones** (Low-Medium complexity)
- Extraction system designed but not in game loop
- Critical for core loop completion
- 1-2 day estimate

### Tier 2 (Short-Term - Depth)

**4. Maps & Modifiers** (High complexity)
- Create endgame variety
- Reasons to farm specific bosses
- 2-3 week estimate

**5. Set Items** (High complexity)
- Major build variety addition
- Requires design + implementation
- 2-3 week estimate

**6. Character Progression** (High complexity)
- Persistent power beyond items
- Skill trees, mastery systems
- 2-4 week estimate

### Tier 3 (Medium-Term - Polish)

**7. Runes/Sockets** (High complexity)
- Deep item customization
- Runewords add huge depth
- 3-4 week estimate

**8. Achievements** (Medium complexity)
- External progression goals
- Player satisfaction/completion tracking
- 1-2 week estimate

**9. Build Templates** (Low-Medium complexity)
- QoL for build switching
- Character alts benefit
- 3-5 day estimate

---

## Comparison to PoE/D2 Features

| Feature | PoE/D2 | Survivor Protocol | Gap |
|---------|-----------|-------------------|-----|
| Base items | ✅ | ✅ | - |
| Affixes | ✅ | ✅ | - |
| Rarity tiers | ✅ | ✅ | - |
| Uniques (Relics) | ✅ | ⚠️ 10% | 23/30 relics missing |
| Crafting | ✅ | ⚠️ 10% | Planned but not implemented |
| Sockets/Runes | ✅ | ❌ 0% | Entirely missing |
| Set items | ✅ | ❌ 0% | Entirely missing |
| Maps/Acts | ✅ | ❌ 0% | Entirely missing |
| Map modifiers | ✅ | ❌ 0% | Entirely missing |
| Currency | Gold/Orbs | Gold/Scrap | Scrap exists, only salvage |
| Stash | ✅ | ✅ | Similar (200 slots) |
| Trading | ✅ | ❌ 0% | No economy between players |
| Skill tree | ✅ | ❌ 0% | Only in-run leveling |
| Passive tree | ✅ | ❌ 0% | Item-based passives only |
| Achievements | ✅ | ❌ 0% | Entirely missing |
| Bosses | ✅ | ⚠️ 60% | Basic, no variety |
| Endgame | Maps/Uber | None | Maps planned |

---

## Quick Wins (1-3 days each)

1. **Fix offhand affix pool bug** (1 day)
   - Add offhand to AFFIX_POOLS
   - Tests for offhand generation

2. **Add implicit min-max rolling to relics** (2 days)
   - Update relic generation
   - Display ranges in tooltips
   - Add roll variance

3. **Implement extraction zones in game loop** (2 days)
   - Add extraction state to game
   - Spawn extraction zones at 5min/10min
   - Implement extraction logic

4. **Add manual secure slot selection** (1 day)
   - Allow players to choose which item to save on death
   - UI in loot inventory

---

## Estimation Methodology

**Completion Criteria:**
- 90-100% = Fully implemented with polish
- 70-89% = Core functionality works, some missing features
- 40-69% = Basic implementation exists, significant gaps
- 10-39% = Partial/skeleton implementation
- 0-9% = Not started

**Complexity:**
- Low = Simple data + UI, 1-2 weeks
- Medium = Moderate logic + design, 2-4 weeks
- High = Complex systems with many interactions, 4-8 weeks

---

## Conclusion

**Strongest Systems:**
- Item generation (well-designed affix system)
- Stash/loadout (sophisticated UI)
- Shop/economy (functional and balanced)

**Critical Gaps:**
- Relics (only 2/30 implemented)
- Crafting (planned but not started)
- Maps/modifiers (entirely missing)
- Character progression (only in-run)

**Recommended Focus:**
1. Complete relics (build variety, chase items)
2. Implement crafting (item progression loop)
3. Add extraction zones (complete core loop)
4. Maps/modifiers (endgame content)

The game has solid foundations. Core item/loot systems are 80-90% complete. What's missing is the *endgame depth* that makes PoE/D2 addictive - crafting progression, map variety, build specialization through sets/runes/skill trees, and long-term character development.
