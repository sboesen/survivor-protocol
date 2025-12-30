import { CHARACTERS } from '../data/characters';
import { SaveData } from './saveData';
import { GachaAnim } from './gacha';
import { SHOP_ITEMS } from '../data/shop';

class MenuSystem {
  renderCharSelect(): void {
    const list = document.getElementById('char-select-list');
    if (!list) return;

    list.innerHTML = '';

    Object.values(CHARACTERS).forEach(c => {
      const owned = SaveData.data.ownedChars.includes(c.id);
      const selected = SaveData.data.selectedChar === c.id;

      const el = document.createElement('div');
      el.className = `char-card ${owned ? 'owned' : ''} ${selected ? 'selected' : ''}`;
      el.innerHTML = `
        <div class="char-icon">${c.icon}</div>
        <div style="color:#fff;font-size:10px;">${c.name}</div>
        <div class="char-stats">${c.desc}<br>Ult: ${c.ult}</div>
      `;

      if (owned) {
        el.onclick = () => {
          SaveData.data.selectedChar = c.id;
          SaveData.save();
          this.renderCharSelect();
        };
      }

      list.appendChild(el);
    });
  }

  renderShop(): void {
    const grid = document.getElementById('shop-grid');
    const goldDisplay = document.getElementById('shop-gold-display');

    if (!grid) return;

    grid.innerHTML = '';

    if (goldDisplay) goldDisplay.textContent = SaveData.data.gold.toString();

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

  openShop(): void {
    const menuScreen = document.getElementById('menu-screen');
    const shopScreen = document.getElementById('shop-screen');

    if (menuScreen) menuScreen.classList.remove('active');
    if (shopScreen) shopScreen.classList.add('active');

    this.renderShop();
  }

  closeShop(): void {
    const menuScreen = document.getElementById('menu-screen');
    const shopScreen = document.getElementById('shop-screen');

    if (shopScreen) shopScreen.classList.remove('active');
    if (menuScreen) menuScreen.classList.add('active');
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
}

export const Menu = new MenuSystem();
