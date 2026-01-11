import { SaveData } from './saveData';
import { Stash } from '../items/stash';
import { ItemGenerator } from '../items/generator';
import type { Item } from '../items/types';
import type { ShopInventoryData, ShopItemListing } from '../types';
import { generateShopInventory } from './shopGeneration';
import { calculateShopPrice } from '../data/shop';

const DAY_MS = 24 * 60 * 60 * 1000;
const MANUAL_REFRESH_COST = 200;

class ShopManagerSystem {
  get data(): ShopInventoryData {
    return this.ensureData();
  }

  init(): void {
    this.ensureInventory();
  }

  ensureInventory(): void {
    const data = this.ensureData();
    const now = Date.now();
    const empty = data.items.length === 0 && data.gamblerItems.length === 0;
    const expired = this.hasExpired(now);
    const stale = data.lastDailyRefresh > 0 && now - data.lastDailyRefresh >= DAY_MS;

    if (empty || expired || stale) {
      this.generateInventory(now);
      SaveData.save();
      return;
    }

    const repaired = this.repairListings(data.items, true) || this.repairListings(data.gamblerItems, false);
    if (repaired) {
      SaveData.save();
    }
  }

  refreshAfterRun(): void {
    this.generateInventory(Date.now());
    SaveData.save();
  }

  manualRefresh(): boolean {
    if (SaveData.data.gold < MANUAL_REFRESH_COST) return false;

    SaveData.data.gold -= MANUAL_REFRESH_COST;
    this.generateInventory(Date.now());
    SaveData.save();
    return true;
  }

  buyListing(listing: ShopItemListing): { success: boolean; item?: Item; reason?: string } {
    const data = this.ensureData();
    if (!data.items.includes(listing) && !data.gamblerItems.includes(listing)) {
      return { success: false, reason: 'listing-not-found' };
    }

    if (SaveData.data.gold < listing.price) {
      return { success: false, reason: 'insufficient-gold' };
    }

    const item = listing.item ?? this.generateVeiledItem(listing);
    const stash = Stash.fromJSON(SaveData.data.stash);
    const slot = stash.addItem(item);
    if (slot === null) {
      return { success: false, reason: 'stash-full' };
    }

    SaveData.data.gold -= listing.price;
    SaveData.data.stash = stash.toJSON();
    this.removeListing(listing);
    SaveData.save();

    return { success: true, item };
  }

  private generateInventory(now: number): void {
    const inventory = generateShopInventory(now);
    const data = this.ensureData();
    data.items = inventory.items;
    data.gamblerItems = inventory.gamblerItems;
    data.lastRefresh = now;
    data.lastDailyRefresh = now;
  }

  private removeListing(listing: ShopItemListing): void {
    const data = this.ensureData();
    const itemIndex = data.items.indexOf(listing);
    if (itemIndex !== -1) {
      data.items.splice(itemIndex, 1);
      return;
    }

    const gamblerIndex = data.gamblerItems.indexOf(listing);
    if (gamblerIndex !== -1) {
      data.gamblerItems.splice(gamblerIndex, 1);
    }
  }

  private hasExpired(now: number): boolean {
    const data = this.ensureData();
    return data.items.some(item => item.expiresAt <= now) ||
      data.gamblerItems.some(item => item.expiresAt <= now);
  }

  private generateVeiledItem(listing: ShopItemListing): Item {
    const maxAttempts = 50;
    let lastItem: Item | null = null;

    for (let i = 0; i < maxAttempts; i++) {
      const item = listing.rarity === 'corrupted'
        ? ItemGenerator.generateCorrupted({ itemType: listing.type, luck: 0 })
        : ItemGenerator.generate({ itemType: listing.type, luck: 0 });
      lastItem = item;
      if (item.rarity === listing.rarity) {
        return item;
      }
    }

    return lastItem ?? ItemGenerator.generate({ itemType: listing.type, luck: 0 });
  }

  private repairListings(listings: ShopItemListing[], forceReveal: boolean): boolean {
    let repaired = false;
    listings.forEach(listing => {
      if (listing.veiled && !forceReveal) return;
      const shouldReveal = listing.veiled && forceReveal;
      const item = listing.item;
      const hasAffixes = Array.isArray(item?.affixes) && item.affixes.length > 0;
      if (shouldReveal || !item || !hasAffixes) {
        const generated = this.generateVeiledItem(listing);
        listing.item = generated;
        if (forceReveal) {
          listing.veiled = false;
          listing.price = calculateShopPrice(generated.rarity, false);
        }
        repaired = true;
      }
    });
    return repaired;
  }

  private ensureData(): ShopInventoryData {
    if (!SaveData.data.shopInventory) {
      SaveData.data.shopInventory = {
        items: [],
        gamblerItems: [],
        lastRefresh: 0,
        lastDailyRefresh: 0,
      };
    }
    return SaveData.data.shopInventory;
  }
}

export const ShopManager = new ShopManagerSystem();
