# Crafting System Implementation Plan

## Overview

Implement a PoE-style crafting system for Survivor Protocol allowing players to modify their items using scrap currency. Features include affix rerolling, tier upgrades, and adding affix slots.

## Current Infrastructure

### Existing Systems
- **Scrap System** (`src/systems/crafting.ts`): Salvage operations with SCRAP_VALUES
- **Item Generation** (`src/items/generator.ts`): Affix rolling with `rollAffixTier()`, `rollAffixCount()`
- **Affix Tables** (`src/items/affixTables.ts`): AFFIX_TIER_BRACKETS, AFFIX_TIER_WEIGHTS, AFFIX_POOLS
- **Item Types** (`src/items/types.ts`): Item interface, ItemAffix, ItemRarity
- **UI Patterns** (`src/systems/menu.ts`, `src/systems/loadoutUI.ts`): Tab navigation, tooltips, confirm modals
- **Selling System** (`src/systems/selling.ts`): Preview pattern for bulk operations

### Scrap Values (Existing)
- Common: 10 scrap
- Magic: 50 scrap
- Rare: 200 scrap
- Legendary: 1000 scrap
- Corrupted: 2500 scrap

## Features to Implement

### 1. Reroll Affix
Replace a single affix with a new random one from same pool.
- **Cost**: 50 scrap (common), 200 scrap (rare+)
- **Success Rate**: 100%
- **Limits**: Track attempts per item

### 2. Upgrade Tier
Increase tier value of an existing affix.
- **Costs**:
  - T1→T2: 100 scrap (100%)
  - T2→T3: 250 scrap (100%)
  - T3→T4: 500 scrap (90%)
  - T4→T5: 1000 scrap (70%)
- **Failure**: Waste scrap, item preserved (no destruction)

### 3. Add Affix Slot
Add a new random affix to item, increasing affix count.
- **Costs**:
  - Magic (1→2 affixes): 500 scrap
  - Rare (3→4 affixes): 2000 scrap
- **Success Rate**: 90%
- **Failure**: Waste scrap without adding affix, consumes attempt
- **Limits**: Max 3 attempts per item

### Constraints
- **No Relic Crafting**: Relics are class-specific uniques and cannot be crafted
- **Stash Only**: Craft items from stash, not loadout
- **Immutable Items**: Create new item objects rather than mutating

## Technical Implementation

### Phase 1: Data Model Changes

#### 1.1 Extend Item Interface

**File**: `src/items/types.ts`

```typescript
export interface CraftingData {
  addSlotAttempts: number;
  rerollAttempts: number;
}

export interface Item {
  id: string;
  name: string;
  baseId: string;
  baseName: string;
  tier: number;
  type: ItemType;
  rarity: ItemRarity;
  affixes: ItemAffix[];
  implicits: ItemAffix[];
  baseTint?: string;
  relicId?: string;
  relicClassId?: string;
  relicEffectId?: string;
  relicEffectName?: string;
  relicEffectDescription?: string[];
  craftingData?: CraftingData; // NEW
}
```

#### 1.2 Crafting Cost Constants

**File**: `src/systems/crafting.ts`

```typescript
const CRAFTING_COSTS = {
  reroll: { common: 50, rare: 200 },
  upgrade: [0, 100, 250, 500, 1000], // Index = current tier
  addSlot: { magic: 500, rare: 2000 },
} as const;

const UPGRADE_SUCCESS_RATES = [1, 1, 1, 0.9, 0.7]; // Index = current tier
const ADD_SLOT_SUCCESS_RATE = 0.9;
const MAX_ADD_SLOT_ATTEMPTS = 3;
const MAX_AFFIX_COUNT = { magic: 2, rare: 4 };
```

### Phase 2: Crafting System Logic

#### 2.1 Extend CraftingSystem Class

**File**: `src/systems/crafting.ts`

```typescript
import { SaveData } from './saveData';
import { Stash } from '../items/stash';
import type { ItemRarity, Item, ItemAffix, CraftingData } from '../items/types';
import { AFFIX_POOLS } from '../items/affixTables';
import { AFFIX_TIER_BRACKETS } from '../items/affixTables';
import { ItemGenerator, rollAffixTier } from '../items/generator';

// Cost helpers
static getCraftingCost(
  operation: 'reroll' | 'upgrade' | 'addSlot',
  rarity: ItemRarity,
  currentTier?: number
): number {
  switch (operation) {
    case 'reroll':
      return CRAFTING_COSTS.reroll[rarity === 'common' ? 'common' : 'rare'];
    case 'upgrade':
      if (!currentTier || currentTier >= 5) return 0;
      return CRAFTING_COSTS.upgrade[currentTier];
    case 'addSlot':
      return rarity === 'magic' ? CRAFTING_COSTS.addSlot.magic : CRAFTING_COSTS.addSlot.rare;
  }
}

// Validation
static canCraft(item: Item): boolean {
  return item.type !== 'relic';
}

static canRerollAffix(item: Item): boolean {
  return this.canCraft(item) && item.affixes.length > 0;
}

static canUpgradeTier(item: Item, affixIndex: number): boolean {
  if (!this.canCraft(item)) return false;
  const affix = item.affixes[affixIndex];
  if (!affix) return false;
  return affix.tier < 5;
}

static canAddAffixSlot(item: Item): boolean {
  if (!this.canCraft(item)) return false;
  if (!['magic', 'rare'].includes(item.rarity)) return false;

  const maxAffixes = MAX_AFFIX_COUNT[item.rarity];
  const attempts = item.craftingData?.addSlotAttempts || 0;

  return item.affixes.length < maxAffixes && attempts < MAX_ADD_SLOT_ATTEMPTS;
}

// Preview operations (no side effects)
static previewRerollAffix(
  slotIndex: number,
  affixIndex: number
): { success: boolean; newAffix: ItemAffix | null; cost: number } {
  const stash = Stash.fromJSON(SaveData.data.stash);
  const item = stash.slots[slotIndex];
  if (!item || !this.canRerollAffix(item)) {
    return { success: false, newAffix: null, cost: 0 };
  }

  const cost = this.getCraftingCost('reroll', item.rarity);
  const pool = [...AFFIX_POOLS[item.type]];

  // Generate new affix (excluding current type to encourage variety)
  const available = pool.filter(def => def.type !== item.affixes[affixIndex].type);
  const definition = available[Math.floor(Math.random() * available.length)];

  const { tier, value } = rollAffixTier(definition, item.rarity, Math.random);
  const newAffix: ItemAffix = {
    type: definition.type,
    tier,
    value,
    isPercent: definition.isPercent,
  };

  return { success: true, newAffix, cost };
}

static previewUpgradeTier(
  slotIndex: number,
  affixIndex: number
): { success: boolean; newAffix: ItemAffix | null; cost: number; successRate: number } {
  const stash = Stash.fromJSON(SaveData.data.stash);
  const item = stash.slots[slotIndex];
  if (!item || !this.canUpgradeTier(item, affixIndex)) {
    return { success: false, newAffix: null, cost: 0, successRate: 0 };
  }

  const affix = item.affixes[affixIndex];
  const currentTier = affix.tier;
  const cost = this.getCraftingCost('upgrade', item.rarity, currentTier);
  const successRate = UPGRADE_SUCCESS_RATES[currentTier];

  // Generate preview of upgraded affix
  const newTier = currentTier + 1;
  const bracket = AFFIX_TIER_BRACKETS[affix.type]?.[newTier - 1];
  if (!bracket) {
    return { success: false, newAffix: null, cost, successRate };
  }

  const isIntegerRange = Number.isInteger(bracket.min) && Number.isInteger(bracket.max);
  const value = isIntegerRange
    ? Math.floor(Math.random() * (bracket.max - bracket.min + 1)) + bracket.min
    : Math.round((bracket.min + (bracket.max - bracket.min) * Math.random()) * 10) / 10;

  const newAffix: ItemAffix = { ...affix, tier: newTier, value };

  return { success: true, newAffix, cost, successRate };
}

static previewAddAffixSlot(
  slotIndex: number
): { success: boolean; newAffix: ItemAffix | null; cost: number; successRate: number; attemptsRemaining: number } {
  const stash = Stash.fromJSON(SaveData.data.stash);
  const item = stash.slots[slotIndex];
  if (!item || !this.canAddAffixSlot(item)) {
    return { success: false, newAffix: null, cost: 0, successRate: 0, attemptsRemaining: 0 };
  }

  const cost = this.getCraftingCost('addSlot', item.rarity);
  const attempts = item.craftingData?.addSlotAttempts || 0;
  const attemptsRemaining = MAX_ADD_SLOT_ATTEMPTS - attempts;

  // Generate new affix
  const pool = [...AFFIX_POOLS[item.type]];
  const existingTypes = new Set(item.affixes.map(a => a.type));
  const available = pool.filter(def => !existingTypes.has(def.type));

  if (available.length === 0) {
    return { success: false, newAffix: null, cost, successRate: ADD_SLOT_SUCCESS_RATE, attemptsRemaining };
  }

  const definition = available[Math.floor(Math.random() * available.length)];
  const { tier, value } = rollAffixTier(definition, item.rarity, Math.random);
  const newAffix: ItemAffix = {
    type: definition.type,
    tier,
    value,
    isPercent: definition.isPercent,
  };

  return { success: true, newAffix, cost, successRate: ADD_SLOT_SUCCESS_RATE, attemptsRemaining };
}

// Execute operations (modify save data)
static rerollAffix(slotIndex: number, affixIndex: number): boolean {
  const stash = Stash.fromJSON(SaveData.data.stash);
  const item = stash.slots[slotIndex];
  if (!item || !this.canRerollAffix(item)) return false;

  const cost = this.getCraftingCost('reroll', item.rarity);
  if (SaveData.data.scrap < cost) return false;

  // Generate new affix
  const pool = [...AFFIX_POOLS[item.type]];
  const available = pool.filter(def => def.type !== item.affixes[affixIndex].type);
  const definition = available[Math.floor(Math.random() * available.length)];
  const { tier, value } = rollAffixTier(definition, item.rarity, Math.random);

  // Create new item
  const newItem: Item = {
    ...item,
    id: createId(Math.random),
    name: generateItemName(item), // Helper needed
    affixes: item.affixes.map((a, i) =>
      i === affixIndex
        ? { type: definition.type, tier, value, isPercent: definition.isPercent }
        : a
    ),
    craftingData: {
      ...item.craftingData,
      rerollAttempts: (item.craftingData?.rerollAttempts || 0) + 1,
    },
  };

  SaveData.data.scrap -= cost;
  SaveData.data.stash = stash.toJSON();
  SaveData.data.stash[slotIndex] = newItem;
  SaveData.save();

  return true;
}

static upgradeTier(slotIndex: number, affixIndex: number): { success: boolean; itemDestroyed: boolean } {
  const stash = Stash.fromJSON(SaveData.data.stash);
  const item = stash.slots[slotIndex];
  if (!item || !this.canUpgradeTier(item, affixIndex)) {
    return { success: false, itemDestroyed: false };
  }

  const affix = item.affixes[affixIndex];
  const cost = this.getCraftingCost('upgrade', item.rarity, affix.tier);
  if (SaveData.data.scrap < cost) return { success: false, itemDestroyed: false };

  // Roll success
  if (Math.random() >= UPGRADE_SUCCESS_RATES[affix.tier]) {
    SaveData.data.scrap -= cost;
    SaveData.save();
    return { success: false, itemDestroyed: false }; // Failed but item preserved
  }

  // Upgrade successful
  const newTier = affix.tier + 1;
  const bracket = AFFIX_TIER_BRACKETS[affix.type]?.[newTier - 1];
  if (!bracket) return { success: false, itemDestroyed: false };

  const isIntegerRange = Number.isInteger(bracket.min) && Number.isInteger(bracket.max);
  const value = isIntegerRange
    ? Math.floor(Math.random() * (bracket.max - bracket.min + 1)) + bracket.min
    : Math.round((bracket.min + (bracket.max - bracket.min) * Math.random()) * 10) / 10;

  const newItem: Item = {
    ...item,
    id: createId(Math.random),
    name: generateItemName(item), // Helper needed
    affixes: item.affixes.map((a, i) =>
      i === affixIndex ? { ...a, tier: newTier, value } : a
    ),
  };

  SaveData.data.scrap -= cost;
  SaveData.data.stash = stash.toJSON();
  SaveData.data.stash[slotIndex] = newItem;
  SaveData.save();

  return { success: true, itemDestroyed: false };
}

static addAffixSlot(slotIndex: number): { success: boolean; attemptsRemaining: number } {
  const stash = Stash.fromJSON(SaveData.data.stash);
  const item = stash.slots[slotIndex];
  if (!item || !this.canAddAffixSlot(item)) {
    return { success: false, attemptsRemaining: item.craftingData?.addSlotAttempts ?? MAX_ADD_SLOT_ATTEMPTS };
  }

  const cost = this.getCraftingCost('addSlot', item.rarity);
  if (SaveData.data.scrap < cost) return { success: false, attemptsRemaining: item.craftingData?.addSlotAttempts ?? MAX_ADD_SLOT_ATTEMPTS };

  const attempts = item.craftingData?.addSlotAttempts || 0;
  const newAttempts = attempts + 1;

  // Roll success
  if (Math.random() >= ADD_SLOT_SUCCESS_RATE) {
    // Failed - consume attempt and scrap
    const newItem: Item = {
      ...item,
      craftingData: { ...item.craftingData, addSlotAttempts: newAttempts },
    };

    SaveData.data.scrap -= cost;
    SaveData.data.stash = stash.toJSON();
    SaveData.data.stash[slotIndex] = newItem;
    SaveData.save();

    return { success: false, attemptsRemaining: MAX_ADD_SLOT_ATTEMPTS - newAttempts };
  }

  // Success - add affix
  const pool = [...AFFIX_POOLS[item.type]];
  const existingTypes = new Set(item.affixes.map(a => a.type));
  const available = pool.filter(def => !existingTypes.has(def.type));

  if (available.length === 0) return { success: false, attemptsRemaining: MAX_ADD_SLOT_ATTEMPTS - newAttempts };

  const definition = available[Math.floor(Math.random() * available.length)];
  const { tier, value } = rollAffixTier(definition, item.rarity, Math.random);
  const newAffix: ItemAffix = {
    type: definition.type,
    tier,
    value,
    isPercent: definition.isPercent,
  };

  const newItem: Item = {
    ...item,
    id: createId(Math.random),
    name: generateItemName(item), // Helper needed
    affixes: [...item.affixes, newAffix],
    craftingData: { ...item.craftingData, addSlotAttempts: newAttempts },
  };

  SaveData.data.scrap -= cost;
  SaveData.data.stash = stash.toJSON();
  SaveData.data.stash[slotIndex] = newItem;
  SaveData.save();

  return { success: true, attemptsRemaining: MAX_ADD_SLOT_ATTEMPTS - newAttempts };
}
```

**Helper needed** (add to ItemGenerator or create utility):
```typescript
function generateItemName(item: Item): string {
  // Re-run name generation with updated affixes
  // Can extract from ItemGenerator.buildName() logic
}
```

### Phase 3: UI Implementation

#### 3.1 Add Crafting Actions to Item Details Panel

**File**: `src/systems/loadoutUI.ts`

Modify `populateDetail()` to accept slotIndex and call new `renderCraftingActions()`:

```typescript
private populateDetail(
  detailEl: HTMLElement,
  item: Item,
  slotIndex: number | null,
  stash: StashSlot[]
): void {
  detailEl.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'loadout-detail-title';
  title.textContent = item.name;

  const meta = document.createElement('div');
  meta.className = 'loadout-detail-meta';
  meta.textContent = `${item.rarity.toUpperCase()} ${item.type.toUpperCase()}`;

  const base = document.createElement('div');
  base.className = 'loadout-detail-base';
  base.textContent = `Base: ${item.baseName} (T${item.tier})`;

  const stats = document.createElement('div');
  stats.className = 'loadout-detail-stats';

  // Implicits
  const implicits = item.implicits ?? [];
  if (implicits.length > 0) {
    implicits.forEach(affix => {
      const line = document.createElement('div');
      line.className = 'affix-line implicit-line';
      line.textContent = this.formatImplicit(affix);
      stats.appendChild(line);
    });
  }

  // Affixes with crafting actions
  if (item.affixes.length > 0) {
    this.renderAffixesWithCrafting(stats, item, slotIndex, stash);
  } else if (implicits.length === 0) {
    stats.textContent = 'No affixes.';
  }

  detailEl.appendChild(title);
  detailEl.appendChild(meta);
  detailEl.appendChild(base);
  detailEl.appendChild(stats);

  // Add affix slot button
  if (slotIndex !== null && CraftingSystem.canAddAffixSlot(item)) {
    this.renderAddAffixButton(detailEl, item, slotIndex, stash);
  }
}
```

#### 3.2 Render Affixes with Crafting Buttons

```typescript
private renderAffixesWithCrafting(
  container: HTMLElement,
  item: Item,
  slotIndex: number | null,
  stash: StashSlot[]
): void {
  // Only show crafting for stash items
  const canCraft = slotIndex !== null && CraftingSystem.canCraft(item);

  item.affixes.forEach((affix, idx) => {
    const row = document.createElement('div');
    row.className = 'crafting-affix-row';

    const affixText = document.createElement('div');
    affixText.className = `affix-line tier-${affix.tier}`;
    affixText.textContent = this.formatAffix(affix);
    row.appendChild(affixText);

    if (canCraft) {
      const actions = document.createElement('div');
      actions.className = 'crafting-actions';

      // Reroll button
      if (CraftingSystem.canRerollAffix(item)) {
        const rerollBtn = this.createCraftButton(
          'Reroll',
          CraftingSystem.getCraftingCost('reroll', item.rarity),
          () => this.handleRerollAffix(slotIndex!, idx)
        );
        actions.appendChild(rerollBtn);
      }

      // Upgrade button
      if (CraftingSystem.canUpgradeTier(item, idx)) {
        const successRate = CraftingSystem.previewUpgradeTier(slotIndex!, idx).successRate;
        const upgradeBtn = this.createCraftButton(
          `Upgrade T${affix.tier}`,
          CraftingSystem.getCraftingCost('upgrade', item.rarity, affix.tier),
          () => this.handleUpgradeTier(slotIndex!, idx),
          successRate
        );
        actions.appendChild(upgradeBtn);
      }

      row.appendChild(actions);
    }

    container.appendChild(row);
  });
}

private createCraftButton(
  label: string,
  cost: number,
  onClick: () => void,
  successRate?: number
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'crafting-btn';

  const hasScrap = SaveData.data.scrap >= cost;
  if (!hasScrap) {
    btn.classList.add('disabled');
  }

  let html = `<span class="crafting-label">${label}</span>`;
  html += `<span class="crafting-cost">⚙️ ${cost}</span>`;
  if (successRate !== undefined) {
    html += `<span class="crafting-chance">${Math.round(successRate * 100)}%</span>`;
  }

  btn.innerHTML = html;
  btn.onclick = hasScrap ? onClick : undefined;

  return btn;
}
```

#### 3.3 Add Affix Slot Button

```typescript
private renderAddAffixButton(
  container: HTMLElement,
  item: Item,
  slotIndex: number,
  stash: StashSlot[]
): void {
  const preview = CraftingSystem.previewAddAffixSlot(slotIndex);
  if (!preview.success) return;

  const separator = document.createElement('div');
  separator.className = 'crafting-separator';
  separator.textContent = '─';
  container.appendChild(separator);

  const btn = document.createElement('button');
  btn.className = 'crafting-add-slot-btn';

  const hasScrap = SaveData.data.scrap >= preview.cost;
  if (!hasScrap) {
    btn.classList.add('disabled');
  }

  btn.innerHTML = `
    <span class="crafting-label">Add Affix Slot</span>
    <span class="crafting-cost">⚙️ ${preview.cost}</span>
    <span class="crafting-chance">${Math.round(preview.successRate * 100)}%</span>
    <span class="crafting-attempts">(${preview.attemptsRemaining} attempts left)</span>
  `;

  if (hasScrap) {
    btn.onclick = () => this.handleAddAffixSlot(slotIndex);
  }

  container.appendChild(btn);
}
```

#### 3.4 Action Handlers

```typescript
private handleRerollAffix(slotIndex: number, affixIndex: number): void {
  const success = CraftingSystem.rerollAffix(slotIndex, affixIndex);
  if (success) {
    this.refreshStashView();
  }
}

private handleUpgradeTier(slotIndex: number, affixIndex: number): void {
  const preview = CraftingSystem.previewUpgradeTier(slotIndex, affixIndex);
  if (preview.cost >= 1000) {
    // Show confirmation for expensive operations
    this.showCraftConfirmModal(
      'Upgrade Tier',
      `Upgrade T${affixIndex} for ${preview.cost} scrap? ${Math.round(preview.successRate * 100)}% success rate.`,
      () => {
        CraftingSystem.upgradeTier(slotIndex, affixIndex);
        this.refreshStashView();
      }
    );
  } else {
    CraftingSystem.upgradeTier(slotIndex, affixIndex);
    this.refreshStashView();
  }
}

private handleAddAffixSlot(slotIndex: number): void {
  const preview = CraftingSystem.previewAddAffixSlot(slotIndex);

  if (preview.cost >= 1000) {
    this.showCraftConfirmModal(
      'Add Affix Slot',
      `Add new affix for ${preview.cost} scrap? ${Math.round(preview.successRate * 100)}% success rate. ${preview.attemptsRemaining} attempts remaining.`,
      () => {
        CraftingSystem.addAffixSlot(slotIndex);
        this.refreshStashView();
      }
    );
  } else {
    CraftingSystem.addAffixSlot(slotIndex);
    this.refreshStashView();
  }
}

private refreshStashView(): void {
  this.render(SaveData.data.stash, SaveData.data.loadout);
}
```

#### 3.5 Confirmation Modal

Reuse existing `#sell-confirm-modal` or create new:

```typescript
private showCraftConfirmModal(
  title: string,
  message: string,
  onConfirm: () => void
): void {
  const modal = document.getElementById('sell-confirm-modal') as HTMLElement;
  if (!modal) return;

  const titleEl = modal.querySelector('.confirm-modal-title') as HTMLElement;
  const textEl = modal.querySelector('.confirm-modal-text') as HTMLElement;
  const confirmBtn = modal.querySelector('.confirm-modal-confirm') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('.confirm-modal-cancel') as HTMLButtonElement;

  titleEl.textContent = `CONFIRM ${title}`;
  textEl.textContent = message;
  modal.classList.add('active');

  const closeModal = () => {
    modal.classList.remove('active');
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  confirmBtn.onclick = () => {
    closeModal();
    onConfirm();
  };

  cancelBtn.onclick = () => {
    closeModal();
  };
}
```

#### 3.6 Update renderDetail() to pass slotIndex

```typescript
private renderDetail(
  detailEl: HTMLElement,
  selection: Selection,
  stash: StashSlot[],
  loadout: LoadoutData
): void {
  detailEl.innerHTML = '';

  const slotIndex = selection.type === 'stash' ? selection.index : null;

  if (selection.type === 'stash') {
    const item = stash[selection.index];
    if (!item) return;
    this.populateDetail(detailEl, item, selection.index, stash);
    return;
  }

  const slotId = selection.slot;
  const item = loadout[slotId];
  if (item) {
    this.populateDetail(detailEl, item, null, stash);
    return;
  }
  // ... rest of existing code
}
```

### Phase 4: Styling

#### 4.1 Crafting UI CSS

**File**: `src/style.css`

```css
/* Crafting Affix Rows */
.crafting-affix-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  margin-bottom: 2px;
}

.crafting-affix-row .affix-line {
  flex: 1;
  margin: 0;
}

.crafting-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Crafting Buttons */
.crafting-btn {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #475569;
  color: #e2e8f0;
  padding: 4px 6px;
  font-size: 7px;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 50px;
}

.crafting-btn:hover:not(.disabled) {
  border-color: var(--rare);
  transform: translateY(-1px);
}

.crafting-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #374151;
}

.crafting-label {
  font-weight: 600;
}

.crafting-cost {
  color: #f97316;
  font-size: 7px;
}

.crafting-chance {
  color: #22c55e;
  font-size: 7px;
}

.crafting-attempts {
  color: #94a3b8;
  font-size: 6px;
}

/* Separator */
.crafting-separator {
  text-align: center;
  color: #475569;
  font-size: 8px;
  padding: 8px 0 4px;
  letter-spacing: 2px;
}

/* Add Affix Slot Button */
.crafting-add-slot-btn {
  background: linear-gradient(135deg, #134e4a 0%, #0f172a 100%);
  border: 2px solid #14b8a6;
  color: #ccfbf1;
  padding: 8px 12px;
  font-size: 9px;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 8px;
  border-radius: 6px;
}

.crafting-add-slot-btn:hover:not(.disabled) {
  border-color: #2dd4bf;
  transform: translateY(-1px);
  box-shadow: 0 0 8px rgba(20, 184, 166, 0.3);
}

.crafting-add-slot-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #374151;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

/* Mobile Adjustments */
@media (max-width: 820px) {
  .crafting-affix-row {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 6px;
  }

  .crafting-actions {
    justify-content: center;
  }

  .crafting-btn {
    flex: 1;
    min-width: 60px;
    padding: 6px 8px;
    font-size: 8px;
  }
}
```

### Phase 5: Testing

#### 5.1 Unit Tests

**File**: `src/systems/__tests__/crafting.test.ts`

```typescript
import { CraftingSystem } from '../crafting';
import { SaveData } from '../saveData';
import { ItemGenerator } from '../../items/generator';

describe('CraftingSystem', () => {
  beforeEach(() => {
    // Reset save data
    SaveData.data.scrap = 10000;
    SaveData.data.stash = [];
  });

  describe('getCraftingCost', () => {
    it('returns correct reroll costs', () => {
      expect(CraftingSystem.getCraftingCost('reroll', 'common')).toBe(50);
      expect(CraftingSystem.getCraftingCost('reroll', 'rare')).toBe(200);
    });

    it('returns correct upgrade costs', () => {
      expect(CraftingSystem.getCraftingCost('upgrade', 'common', 1)).toBe(100);
      expect(CraftingSystem.getCraftingCost('upgrade', 'common', 4)).toBe(1000);
    });

    it('returns correct addSlot costs', () => {
      expect(CraftingSystem.getCraftingCost('addSlot', 'magic')).toBe(500);
      expect(CraftingSystem.getCraftingCost('addSlot', 'rare')).toBe(2000);
    });
  });

  describe('canCraft', () => {
    it('returns true for regular items', () => {
      const weapon = ItemGenerator.generate({ itemType: 'weapon', luck: 0 });
      expect(CraftingSystem.canCraft(weapon)).toBe(true);
    });

    it('returns false for relics', () => {
      const relic = ItemGenerator.generateRelic({ itemType: 'relic', luck: 0, classId: 'wizard' });
      expect(CraftingSystem.canCraft(relic)).toBe(false);
    });
  });

  describe('rerollAffix', () => {
    it('replaces affix with new type', () => {
      const item = ItemGenerator.generate({ itemType: 'weapon', luck: 0 });
      SaveData.data.stash[0] = item;
      const originalType = item.affixes[0].type;

      const success = CraftingSystem.rerollAffix(0, 0);

      expect(success).toBe(true);
      expect(SaveData.data.stash[0].affixes[0].type).not.toBe(originalType);
      expect(SaveData.data.scrap).toBe(10000 - CraftingSystem.getCraftingCost('reroll', item.rarity));
    });
  });

  describe('upgradeTier', () => {
    it('upgrades tier on success', () => {
      const item = ItemGenerator.generate({ itemType: 'weapon', luck: 0 });
      item.affixes[0].tier = 1;
      SaveData.data.stash[0] = item;

      // Mock RNG for success
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.1);
      const result = CraftingSystem.upgradeTier(0, 0);

      expect(result.success).toBe(true);
      expect(SaveData.data.stash[0].affixes[0].tier).toBe(2);
      expect(result.itemDestroyed).toBe(false);
      mockRandom.mockRestore();
    });

    it('fails roll without destroying item', () => {
      const item = ItemGenerator.generate({ itemType: 'weapon', luck: 0 });
      item.affixes[0].tier = 3;
      SaveData.data.stash[0] = item;
      const originalId = item.id;

      // Mock RNG for failure (90% success for T3→T4)
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.95);
      const result = CraftingSystem.upgradeTier(0, 0);

      expect(result.success).toBe(false);
      expect(result.itemDestroyed).toBe(false);
      expect(SaveData.data.stash[0].affixes[0].tier).toBe(3);
      expect(SaveData.data.scrap).toBe(10000 - 500); // Scrap deducted on failure
      mockRandom.mockRestore();
    });
  });

  describe('addAffixSlot', () => {
    it('adds new affix on success', () => {
      const item = ItemGenerator.generate({ itemType: 'weapon', luck: 0, rarityBoost: 1 }); // Force magic
      SaveData.data.stash[0] = item;
      const originalCount = item.affixes.length;

      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.1);
      const result = CraftingSystem.addAffixSlot(0);

      expect(result.success).toBe(true);
      expect(SaveData.data.stash[0].affixes.length).toBe(originalCount + 1);
      expect(SaveData.data.stash[0].craftingData?.addSlotAttempts).toBe(1);
      mockRandom.mockRestore();
    });

    it('tracks attempts correctly', () => {
      const item = ItemGenerator.generate({ itemType: 'weapon', luck: 0, rarityBoost: 1 });
      SaveData.data.stash[0] = item;

      // Fail 3 times
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.95);
      CraftingSystem.addAffixSlot(0);
      CraftingSystem.addAffixSlot(0);
      CraftingSystem.addAffixSlot(0);

      expect(SaveData.data.stash[0].craftingData?.addSlotAttempts).toBe(3);
      expect(CraftingSystem.canAddAffixSlot(SaveData.data.stash[0])).toBe(false);
      mockRandom.mockRestore();
    });
  });
});
```

## Implementation Checklist

### Data Model
- [ ] Add `CraftingData` interface to `src/items/types.ts`
- [ ] Add `craftingData?: CraftingData` to `Item` interface
- [ ] Add cost constants to `src/systems/crafting.ts`

### Core Logic
- [ ] Implement `getCraftingCost()` helper
- [ ] Implement `canCraft()`, `canRerollAffix()`, `canUpgradeTier()`, `canAddAffixSlot()`
- [ ] Implement `previewRerollAffix()`, `previewUpgradeTier()`, `previewAddAffixSlot()`
- [ ] Implement `rerollAffix()` execution
- [ ] Implement `upgradeTier()` execution
- [ ] Implement `addAffixSlot()` execution
- [ ] Create `generateItemName()` helper

### UI Components
- [ ] Modify `populateDetail()` to accept slotIndex
- [ ] Create `renderAffixesWithCrafting()` method
- [ ] Create `createCraftButton()` helper
- [ ] Create `renderAddAffixButton()` method
- [ ] Implement `handleRerollAffix()`, `handleUpgradeTier()`, `handleAddAffixSlot()`
- [ ] Implement `showCraftConfirmModal()`
- [ ] Update `renderDetail()` to pass slotIndex for stash items
- [ ] Update calls to `populateDetail()` throughout LoadoutUI

### Styling
- [ ] Add `.crafting-affix-row` styles
- [ ] Add `.crafting-btn` styles
- [ ] Add `.crafting-add-slot-btn` styles
- [ ] Add `.crafting-separator` styles
- [ ] Add mobile responsive adjustments
- [ ] Test on various screen sizes

### Testing
- [ ] Write unit tests for cost calculations
- [ ] Write unit tests for canCraft and validation methods
- [ ] Write unit tests for each crafting operation
- [ ] Write tests for attempt tracking
- [ ] Write tests for scrap deduction
- [ ] Manual testing in browser
- [ ] Test with different item rarities
- [ ] Test with relics (should be disabled)
- [ ] Test failure scenarios (insufficient scrap, max attempts)
- [ ] Test confirmation modals

### Documentation
- [ ] Update AGENTS.md with crafting system notes
- [ ] Document cost table
- [ ] Document success rates
- [ ] Document attempt limits

## Cost Summary

| Operation | Condition | Cost | Success Rate | Confirms |
|-----------|-----------|------|--------------|----------|
| Reroll Affix | Common | 50 scrap | 100% | No |
| Reroll Affix | Rare+ | 200 scrap | 100% | No |
| Upgrade T1→T2 | Any | 100 scrap | 100% | No |
| Upgrade T2→T3 | Any | 250 scrap | 100% | No |
| Upgrade T3→T4 | Any | 500 scrap | 90% | No |
| Upgrade T4→T5 | Any | 1000 scrap | 70% | Yes |
| Add Affix | Magic | 500 scrap | 90% | No |
| Add Affix | Rare | 2000 scrap | 90% | Yes |

## Success Criteria

1. Players can select stash items and see crafting options
2. All three operations (reroll, upgrade, add slot) work correctly
3. Scrap is properly deducted on all operations
4. Success/failure rates match design
5. Attempt limits are enforced
6. Relics cannot be crafted
7. Confirmation modals show for expensive operations
8. UI updates immediately after operations
9. Crafting data persists across save/load
10. Mobile UI is functional

## Future Enhancements

- Visual feedback animations for success/failure
- Crafting history viewer
- Bulk crafting operations
- Recipe-based crafting (specific affix combinations)
- Socket/crafting slot system
- Mirror of Kalandra (duplicate item)
- Affix locking (protect specific affixes from reroll)
