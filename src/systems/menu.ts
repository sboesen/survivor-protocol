import { CHARACTERS } from '../data/characters';
import { SaveData } from './saveData';
import { GachaAnim } from './gacha';
import { SHOP_ITEMS } from '../data/shop';
import { SpriteViewer } from './spriteViewer';
import { LoadoutUI } from './loadoutUI';
import { ShopManager } from './shopManager';
import type { ShopItemListing } from '../types';

class MenuSystem {
  private shopTabsBound = false;

  private getWeaponIconHtml(weaponId: string): string {
    const mapping: Record<string, string> = {
      fireball: '/weapons/wand.png',
      bubble_stream: '/weapons/spear.png',
      thrown_cds: '/weapons/dagger.png',
      shield_bash: '/weapons/hammer.png',
      frying_pan: '/weapons/club.png',
      lighter: '/weapons/torch.png',
      bow: '/weapons/bow.png',
    };
    const src = mapping[weaponId];
    if (src) return `<div class="mini-icon"><img src="${src}" alt=""></div>`;
    return `<div class="mini-icon">⚔️</div>`;
  }

  private getUltIconHtml(ult: string): string {
    const mapping: Record<string, string> = {
      'Meteor Swarm': '☄️',
      'Divine Shield': '🛡️',
      'Shadow Step': '👣',
      'Iron Will': '💪',
      'Inferno': '🔥',
      'Smoke Screen': '💨',
      'Volley': '🏹',
    };
    return `<div class="mini-icon">${mapping[ult] || '✨'}</div>`;
  }

  renderCharSelect(): void {
    const list = document.getElementById('char-select-list');
    if (!list) return;

    list.innerHTML = '';

    Object.values(CHARACTERS).forEach(c => {
      const owned = SaveData.data.ownedChars.includes(c.id);
      const selected = SaveData.data.selectedChar === c.id;

      const el = document.createElement('div');
      el.className = `char-card ${owned ? 'owned' : ''} ${selected ? 'selected' : ''}`;

      const portraitHtml = c.id === 'wizard'
        ? `<img src="/${c.id}.png" class="pixelated">`
        : `<div class="char-portrait-emoji">${c.icon}</div>`;

      // Extract first word/sentence for description improvement
      const shortDesc = c.desc.split('.')[0] + '.';

      el.innerHTML = `
        <div class="char-card-header">
          <div class="char-name">${c.name}</div>
          <div class="info-btn" title="View Level Path">i</div>
        </div>
        <div class="char-card-body">
          <div class="char-portrait-frame">
            ${portraitHtml}
          </div>
        </div>
        <div class="char-card-footer">
          <div class="char-desc">${shortDesc}</div>
          
          <div class="char-info-row">
            <div class="char-info-label">Starter</div>
            <div class="char-info-value">
              ${this.getWeaponIconHtml(c.weapon)}
              <div class="char-info-text">${c.weapon.replace(/_/g, ' ')}</div>
            </div>
          </div>

          <div class="char-info-row">
            <div class="char-info-label">Ultimate</div>
            <div class="char-info-value">
              ${this.getUltIconHtml(c.ult)}
              <div class="char-info-text ult">${c.ult}</div>
            </div>
          </div>
        </div>
      `;

      // Attach selection listener to the card
      if (owned) {
        el.onclick = () => {
          SaveData.data.selectedChar = c.id;
          SaveData.save();
          this.renderCharSelect();
        };
      }

      // Attach info listener to the "i" button
      const infoBtn = el.querySelector('.info-btn') as HTMLElement;
      if (infoBtn) {
        infoBtn.onclick = (e) => {
          e.stopPropagation();
          (window as any).UI.showLevelInfo(c.weapon);
        };
      }

      list.appendChild(el);
    });
  }

  renderShop(): void {
    const goldDisplay = document.getElementById('shop-gold-display');
    if (goldDisplay) goldDisplay.textContent = SaveData.data.gold.toString();

    this.renderUpgrades();
    this.renderShopItems(ShopManager.data.items, 'shop-items-grid');
    this.renderShopItems(ShopManager.data.gamblerItems, 'gambler-grid');
    this.updateShopTimers();
  }

  manualRefreshShop(): void {
    const refreshed = ShopManager.manualRefresh();
    if (!refreshed) {
      console.warn('[Shop] Not enough gold to refresh.');
      return;
    }
    this.renderShop();
  }

  openShop(): void {
    const menuScreen = document.getElementById('menu-screen');
    const shopScreen = document.getElementById('shop-screen');

    if (menuScreen) menuScreen.classList.remove('active');
    if (shopScreen) shopScreen.classList.add('active');

    ShopManager.ensureInventory();
    this.renderShop();
    this.bindShopTabs();
  }

  closeShop(): void {
    const menuScreen = document.getElementById('menu-screen');
    const shopScreen = document.getElementById('shop-screen');

    if (shopScreen) shopScreen.classList.remove('active');
    if (menuScreen) menuScreen.classList.add('active');
  }

  openStash(): void {
    const menuScreen = document.getElementById('menu-screen');
    const stashScreen = document.getElementById('stash-screen');

    if (menuScreen) menuScreen.classList.remove('active');
    if (stashScreen) stashScreen.classList.add('active');

    LoadoutUI.render(SaveData.data.stash, SaveData.data.loadout);
  }

  closeStash(): void {
    const menuScreen = document.getElementById('menu-screen');
    const stashScreen = document.getElementById('stash-screen');

    if (stashScreen) stashScreen.classList.remove('active');
    if (menuScreen) menuScreen.classList.add('active');

    this.renderCharSelect();
  }

  openGacha(): void {
    const menuScreen = document.getElementById('menu-screen');
    const gachaScreen = document.getElementById('gacha-screen');
    const goldDisplay = document.getElementById('gacha-gold');

    if (menuScreen) menuScreen.classList.remove('active');
    if (gachaScreen) gachaScreen.classList.add('active');
    if (goldDisplay) goldDisplay.textContent = SaveData.data.gold.toString();

    GachaAnim.drawIdle();
  }

  closeGacha(): void {
    const menuScreen = document.getElementById('menu-screen');
    const gachaScreen = document.getElementById('gacha-screen');

    if (gachaScreen) gachaScreen.classList.remove('active');
    if (menuScreen) menuScreen.classList.add('active');

    this.renderCharSelect();
  }

  openDebug(): void {
    const menuScreen = document.getElementById('menu-screen');
    const debugScreen = document.getElementById('debug-screen');

    if (menuScreen) menuScreen.classList.remove('active');
    if (debugScreen) debugScreen.classList.add('active');
  }

  closeDebug(): void {
    const menuScreen = document.getElementById('menu-screen');
    const debugScreen = document.getElementById('debug-screen');

    if (debugScreen) debugScreen.classList.remove('active');
    if (menuScreen) menuScreen.classList.add('active');

    this.renderCharSelect();
  }

  openSpriteViewer(): void {
    const debugScreen = document.getElementById('debug-screen');
    const viewerScreen = document.getElementById('sprite-viewer-screen');

    if (debugScreen) debugScreen.classList.remove('active');
    if (viewerScreen) viewerScreen.classList.add('active');

    SpriteViewer.open();
  }

  closeSpriteViewer(): void {
    const debugScreen = document.getElementById('debug-screen');
    const viewerScreen = document.getElementById('sprite-viewer-screen');

    if (viewerScreen) viewerScreen.classList.remove('active');
    if (debugScreen) debugScreen.classList.add('active');

    SpriteViewer.close();
  }

  private renderUpgrades(): void {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.keys(SHOP_ITEMS).forEach(k => {
      const item = SHOP_ITEMS[k];
      const lvl = SaveData.data.shop[k] || 0;
      const cost = item.cost(lvl);
      const max = lvl >= item.max;

      const btn = document.createElement('button');
      const goldColor = SaveData.data.gold >= cost ? '#fd0' : '#f00';
      btn.innerHTML = `
        <div>${item.name} ${lvl}/${item.max}</div>
        <div style="font-size:8px;color:#aaa">${item.desc}</div>
        <div style="color:${goldColor}">${max ? 'MAX' : cost + 'G'}</div>
      `;

      btn.onclick = () => {
        if (!max && SaveData.data.gold >= cost) {
          SaveData.data.gold -= cost;
          SaveData.data.shop[k] = lvl + 1;
          SaveData.save();
          this.renderShop();
        }
      };

      if (max) btn.disabled = true;

      grid.appendChild(btn);
    });
  }

  private renderShopItems(listings: ShopItemListing[], gridId: string): void {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';

    if (listings.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'shop-empty';
      empty.textContent = 'No items available.';
      grid.appendChild(empty);
      return;
    }

    listings.forEach(listing => {
      const card = document.createElement('div');
      card.className = `shop-item-card rarity-${listing.rarity} ${listing.veiled ? 'veiled' : 'revealed'}`;

      if (listing.veiled) {
        card.innerHTML = `
          <div class="shop-item-title">VEILED</div>
          <div class="shop-item-rarity">${listing.rarity.toUpperCase()}</div>
          <div class="shop-item-type shop-item-reveal">${listing.type.toUpperCase()}</div>
          <div class="shop-item-price">${listing.price}G</div>
          <div class="shop-item-expiry" data-expires="${listing.expiresAt}">Expires: ${this.formatExpiry(listing.expiresAt)}</div>
          <button class="shop-buy-btn">BUY</button>
        `;
      } else if (listing.item) {
        card.innerHTML = `
          <div class="shop-item-title">${listing.item.name}</div>
          <div class="shop-item-rarity">${listing.item.rarity.toUpperCase()}</div>
          <div class="shop-item-type">${listing.item.type.toUpperCase()}</div>
          <div class="shop-item-price">${listing.price}G</div>
          <div class="shop-item-expiry" data-expires="${listing.expiresAt}">Expires: ${this.formatExpiry(listing.expiresAt)}</div>
          <button class="shop-buy-btn">BUY</button>
        `;
      }

      const buyBtn = card.querySelector('.shop-buy-btn') as HTMLButtonElement | null;
      if (buyBtn) {
        buyBtn.onclick = () => {
          const result = ShopManager.buyListing(listing);
          if (!result.success) {
            console.warn('[Shop] Purchase failed:', result.reason);
            return;
          }
          this.renderShop();
        };
      }

      grid.appendChild(card);
    });
  }

  private bindShopTabs(): void {
    if (this.shopTabsBound) return;
    const tabs = document.querySelectorAll<HTMLButtonElement>('.shop-tab');
    tabs.forEach(tab => {
      tab.onclick = () => this.setActiveShopTab(tab.dataset.tab || 'upgrades');
    });
    this.shopTabsBound = true;
  }

  private setActiveShopTab(tabId: string): void {
    const tabs = document.querySelectorAll<HTMLButtonElement>('.shop-tab');
    tabs.forEach(tab => {
      const isActive = tab.dataset.tab === tabId;
      tab.classList.toggle('active', isActive);
    });

    const contents = document.querySelectorAll<HTMLElement>('.shop-tab-content');
    contents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
  }

  private updateShopTimers(): void {
    const dailyTimer = document.getElementById('daily-timer');
    if (dailyTimer) {
      const nextRefresh = ShopManager.data.lastDailyRefresh + 24 * 60 * 60 * 1000;
      dailyTimer.textContent = this.formatCountdown(nextRefresh - Date.now());
    }

    const expiryEls = document.querySelectorAll<HTMLElement>('.shop-item-expiry');
    expiryEls.forEach(el => {
      const expiresAt = Number(el.dataset.expires || 0);
      if (expiresAt > 0) {
        el.textContent = `Expires: ${this.formatExpiry(expiresAt)}`;
      }
    });
  }

  private formatExpiry(expiresAt: number): string {
    const remaining = Math.max(0, expiresAt - Date.now());
    const totalMinutes = Math.ceil(remaining / (60 * 1000));
    if (totalMinutes <= 0) return 'Expired';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 1) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  private formatCountdown(remaining: number): string {
    const clamped = Math.max(0, remaining);
    const totalSeconds = Math.ceil(clamped / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }
}

export const Menu = new MenuSystem();
