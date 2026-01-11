import { CHARACTERS } from '../data/characters';
import { SaveData } from './saveData';
import { GachaAnim } from './gacha';
import { SHOP_ITEMS } from '../data/shop';
import { SpriteViewer } from './spriteViewer';
import { LoadoutUI } from './loadoutUI';
import { ShopManager } from './shopManager';
import { SellingSystem } from './selling';
import { Stash } from '../items/stash';
import type { ShopItemListing } from '../types';
import type { ItemRarity, ItemAffix } from '../items/types';
import { AFFIX_TIER_BRACKETS } from '../items/affixTables';

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
          // Update selection without re-rendering entire list
          const allCards = document.querySelectorAll('.char-card');
          allCards.forEach(card => card.classList.remove('selected'));
          el.classList.add('selected');
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
    this.renderSellTab();
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

      const tooltip = document.getElementById('loadout-tooltip') as HTMLElement | null;

      const showItemTooltip = (e: MouseEvent) => {
        if (!tooltip) return;
        if (!listing.veiled && listing.item) {
          this.renderItemTooltip(tooltip, listing.item);
          tooltip.style.display = 'block';
          this.positionTooltip(tooltip, e.clientX, e.clientY);
        }
      };

      const hideItemTooltip = () => {
        if (!tooltip) return;
        tooltip.style.display = 'none';
        tooltip.innerHTML = '';
      };

      card.addEventListener('mouseenter', showItemTooltip);
      card.addEventListener('mouseleave', hideItemTooltip);

      grid.appendChild(card);
    });
  }

  private renderSellTab(): void {
    const grid = document.getElementById('sell-grid');
    if (!grid) return;

    const stash = Stash.fromJSON(SaveData.data.stash);
    grid.innerHTML = '';

    if (stash.slots.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'shop-empty';
      empty.textContent = 'Your stash is empty.';
      empty.style.gridColumn = '1 / -1';
      grid.appendChild(empty);
      return;
    }

    const HOLD_DURATION = 1000;
    const tooltip = document.getElementById('loadout-tooltip') as HTMLElement | null;

    stash.slots.forEach((item, index) => {
      if (!item) return;

      const card = document.createElement('div');
      card.className = `sell-item rarity-${item.rarity} ${item.type === 'relic' ? 'type-relic' : ''}`;
      card.dataset.index = index.toString();

      const sellValue = SellingSystem.getSellValue(item.rarity);

      card.innerHTML = `
        <div class="sell-item-name">${item.name}</div>
        <div class="sell-item-rarity">${item.rarity.toUpperCase()}</div>
        <div class="sell-item-value">${sellValue}G</div>
        <div class="sell-progress-bar"></div>
      `;

      const progressBar = card.querySelector('.sell-progress-bar') as HTMLElement;
      let animationFrame: number | null = null;
      let startTime: number = 0;

      const showItemTooltip = (e?: MouseEvent) => {
        if (!tooltip) return;
        this.renderItemTooltip(tooltip, item);
        tooltip.style.display = 'block';
        this.positionTooltip(tooltip, e?.clientX, e?.clientY, card);
      };

      const hideItemTooltip = () => {
        if (!tooltip) return;
        tooltip.style.display = 'none';
        tooltip.innerHTML = '';
      };

      let touchStartTime = 0;

      const handleStart = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();

        if (e instanceof TouchEvent) {
          touchStartTime = Date.now();
        }

        if (card.classList.contains('holding')) return;

        card.classList.add('holding');
        startTime = Date.now();

        const updateProgress = () => {
          if (!card.classList.contains('holding')) return;

          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
          progressBar.style.setProperty('--progress', `${progress}%`);
          progressBar.style.width = `${progress}%`;

          if (elapsed < HOLD_DURATION) {
            animationFrame = requestAnimationFrame(updateProgress);
          } else {
            card.classList.remove('holding');
            progressBar.style.width = '0%';
            hideItemTooltip();

            const goldEarned = SellingSystem.sell(index);
            if (goldEarned > 0) {
              this.renderShop();
            }
          }
        };

        animationFrame = requestAnimationFrame(updateProgress);
      };

      const handleEnd = (e?: Event) => {
        if (e instanceof TouchEvent) {
          const touchDuration = Date.now() - touchStartTime;
          if (touchDuration < HOLD_DURATION && touchDuration > 100) {
            showItemTooltip();
            e.preventDefault();
            e.stopPropagation();
          }
        }

        card.classList.remove('holding');
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        progressBar.style.width = '0%';
        progressBar.style.removeProperty('--progress');
      };

      card.addEventListener('mouseenter', (e) => showItemTooltip(e));
      card.addEventListener('mouseleave', () => {
        hideItemTooltip();
        handleEnd();
      });
      card.addEventListener('click', () => {
        if (window.innerWidth > 768) {
          handleEnd();
        }
      });

      card.addEventListener('mousedown', handleStart);
      card.addEventListener('touchstart', handleStart, { passive: false });
      card.addEventListener('touchend', handleEnd);
      card.addEventListener('touchcancel', handleEnd);

      grid.appendChild(card);
    });

    this.renderSellButtons();

    grid.onclick = (e) => {
      if ((e.target as HTMLElement).classList.contains('sell-grid')) {
        this.hideTooltip();
      }
    };
  }

  private renderItemTooltip(tooltip: HTMLElement, item: any): void {
    tooltip.innerHTML = '';
    tooltip.className = 'loadout-tooltip';

    const rarityColor = item.rarity === 'legendary' ? '#fbbf24'
      : item.rarity === 'rare' ? '#a855f7'
      : item.rarity === 'magic' ? '#60a5fa'
      : item.type === 'relic' ? '#f97316'
      : '#e5e7eb';

    tooltip.style.borderColor = rarityColor;

    const stats = document.createElement('div');
    stats.className = 'loadout-detail-stats';

    const title = document.createElement('div');
    title.className = 'loadout-detail-title';
    title.style.color = rarityColor;
    title.textContent = item.name;

    const meta = document.createElement('div');
    meta.className = 'loadout-detail-meta';
    meta.textContent = `${item.rarity.toUpperCase()} ${item.type.toUpperCase()}`;

    const base = document.createElement('div');
    base.className = 'loadout-detail-base';
    base.textContent = `Base: ${item.baseName} (T${item.tier})`;

    const implicits = item.implicits ?? [];
    if (implicits.length > 0) {
      implicits.forEach((affix: any) => {
        const line = document.createElement('div');
        line.className = 'affix-line implicit-line';
        line.textContent = this.formatImplicit(affix);
        stats.appendChild(line);
      });
    }

    if (item.affixes && item.affixes.length > 0) {
      item.affixes.forEach((affix: any) => {
        const line = document.createElement('div');
        line.className = `affix-line tier-${affix.tier}`;
        line.textContent = this.formatAffix(affix);
        stats.appendChild(line);
      });
    } else if (implicits.length === 0) {
      stats.textContent = 'No affixes.';
    }

    const close = document.createElement('div');
    close.className = 'tooltip-close';
    close.textContent = '×';
    close.onclick = () => this.hideTooltip();

    tooltip.appendChild(close);
    tooltip.appendChild(title);
    tooltip.appendChild(meta);
    tooltip.appendChild(base);
    tooltip.appendChild(stats);
  }

  private formatImplicit(affix: ItemAffix): string {
    const labels: Record<string, string> = {
      flatDamage: 'Damage',
      percentDamage: 'Damage',
      areaFlat: 'Area',
      areaPercent: 'Area',
      cooldownReduction: 'Cooldown Reduction',
      projectiles: 'Projectiles',
      pierce: 'Pierce',
      duration: 'Duration',
      speed: 'Speed',
      projectileSpeed: 'Projectile Speed',
      maxHp: 'Max HP',
      armor: 'Armor',
      hpRegen: 'HP Regen',
      percentHealing: 'Healing',
      magnet: 'Magnet',
      luck: 'Luck',
      percentGold: 'Gold',
      pickupRadius: 'Pickup Radius',
      percentXp: 'XP',
      allStats: 'All Stats',
      ricochetDamage: 'Ricochet Damage',
    };
    const bracket = AFFIX_TIER_BRACKETS[affix.type]?.[affix.tier - 1];
    const sign = affix.value >= 0 ? '+' : '';
    const value = affix.isPercent ? `${affix.value}%` : `${affix.value}`;
    const bracketSuffix = bracket
      ? ` (${bracket.min}${affix.isPercent ? '%' : ''}-${bracket.max}${affix.isPercent ? '%' : ''})`
      : '';
    return `Implicit: ${sign}${value} ${labels[affix.type] ?? affix.type}${bracketSuffix}`;
  }

  private formatAffix(affix: ItemAffix): string {
    const labels: Record<string, string> = {
      flatDamage: 'Damage',
      percentDamage: 'Damage',
      areaFlat: 'Area',
      areaPercent: 'Area',
      cooldownReduction: 'Cooldown Reduction',
      projectiles: 'Projectiles',
      pierce: 'Pierce',
      duration: 'Duration',
      speed: 'Speed',
      projectileSpeed: 'Projectile Speed',
      maxHp: 'Max HP',
      armor: 'Armor',
      hpRegen: 'HP Regen',
      percentHealing: 'Healing',
      magnet: 'Magnet',
      luck: 'Luck',
      percentGold: 'Gold',
      pickupRadius: 'Pickup Radius',
      percentXp: 'XP',
      allStats: 'All Stats',
      ricochetDamage: 'Ricochet Damage',
    };
    const bracket = AFFIX_TIER_BRACKETS[affix.type]?.[affix.tier - 1];
    const sign = affix.value >= 0 ? '+' : '';
    const value = affix.isPercent ? `${affix.value}%` : `${affix.value}`;
    const bracketSuffix = bracket
      ? ` (${bracket.min}${affix.isPercent ? '%' : ''}-${bracket.max}${affix.isPercent ? '%' : ''})`
      : '';
    return `T${affix.tier} ${sign}${value} ${labels[affix.type] ?? affix.type}${bracketSuffix}`;
  }

  private positionTooltip(tooltip: HTMLElement, x?: number, y?: number, anchor?: HTMLElement): void {
    let posX = 0, posY = 0;

    if (x !== undefined && y !== undefined) {
      posX = x + 12;
      posY = y + 12;
    } else if (anchor) {
      const rect = anchor.getBoundingClientRect();
      posX = rect.right + 12;
      posY = rect.top + 12;
    }

    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const maxX = window.innerWidth - width - 8;
    const maxY = window.innerHeight - height - 8;

    if (posX > maxX) posX = maxX;
    if (posY > maxY) posY = maxY;
    if (posX < 8) posX = 8;
    if (posY < 8) posY = 8;

    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
  }

  private renderSellButtons(): void {
    const buttonsContainer = document.getElementById('sell-buttons');
    if (!buttonsContainer) return;

    const stash = Stash.fromJSON(SaveData.data.stash);
    const counts: Record<string, number> = { common: 0, magic: 0, rare: 0, legendary: 0, relic: 0 };

    stash.slots.forEach(item => {
      if (item) {
        const key = item.type === 'relic' ? 'relic' : item.rarity;
        counts[key]++;
      }
    });

    const buttonConfigs = [
      { label: 'COMMON', rarities: ['common' as ItemRarity], key: 'common' },
      { label: 'MAGIC', rarities: ['magic' as ItemRarity], key: 'magic' },
      { label: 'RARE', rarities: ['rare' as ItemRarity], key: 'rare' },
      { label: 'LEGENDARY', rarities: ['legendary' as ItemRarity], key: 'legendary' },
      { label: 'RELICS', rarities: ['common' as ItemRarity, 'magic' as ItemRarity, 'rare' as ItemRarity, 'legendary' as ItemRarity], key: 'relic', filter: (item: any) => item?.type === 'relic' },
      { label: 'ALL', rarities: ['common' as ItemRarity, 'magic' as ItemRarity, 'rare' as ItemRarity, 'legendary' as ItemRarity], key: 'all' },
    ];

    buttonsContainer.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'sell-buttons-title';
    title.textContent = 'BULK SELL';
    buttonsContainer.appendChild(title);

    const row = document.createElement('div');
    row.className = 'sell-buttons-row';

    buttonConfigs.forEach(config => {
      const count = config.filter
        ? stash.slots.filter(config.filter).length
        : counts[config.key] || 0;

      if (count === 0) return;

      const btn = document.createElement('button');
      btn.className = 'sell-btn';
      btn.innerHTML = `
        <span>${config.label}</span>
        <span class="btn-count">(${count})</span>
      `;

      btn.onclick = () => {
        const preview = config.filter
          ? SellingSystem.previewSellFiltered(config.filter)
          : config.key === 'all'
          ? SellingSystem.previewSellAllByRarity(config.rarities)
          : SellingSystem.previewSellAllByRarity(config.rarities);

        if (preview.count > 0) {
          this.showConfirmModal(config.label, preview, () => {
            config.filter
              ? SellingSystem.sellFiltered(config.filter)
              : SellingSystem.sellAllByRarity(config.rarities);
            this.renderShop();
          });
        }
      };

      row.appendChild(btn);
    });

    buttonsContainer.appendChild(row);
  }

  private showConfirmModal(label: string, preview: { count: number; gold: number }, onConfirm: () => void): void {
    const modal = document.getElementById('sell-confirm-modal');
    if (!modal) return;

    const titleEl = modal.querySelector('.confirm-modal-title') as HTMLElement;
    const textEl = modal.querySelector('.confirm-modal-text') as HTMLElement;
    const confirmBtn = modal.querySelector('.confirm-modal-confirm') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('.confirm-modal-cancel') as HTMLButtonElement;

    titleEl.textContent = `SELL ${label}`;
    textEl.textContent = `Sell ${preview.count} item${preview.count > 1 ? 's' : ''} for ${preview.gold} gold?`;
    modal.classList.add('active');

    const closeModal = () => {
      modal.classList.remove('active');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      this.hideTooltip();
    };

    confirmBtn.onclick = () => {
      closeModal();
      onConfirm();
    };

    cancelBtn.onclick = () => {
      closeModal();
    };
  }

  private hideTooltip(): void {
    const tooltip = document.getElementById('loadout-tooltip') as HTMLElement | null;
    if (tooltip) {
      tooltip.style.display = 'none';
      tooltip.innerHTML = '';
    }
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

    this.hideTooltip();
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
