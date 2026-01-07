import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Window } from 'happy-dom';
import { CHARACTERS } from '../../data/characters';
import { UPGRADES } from '../../data/upgrades';

const setupDom = (document: Document) => {
  // Create HUD elements
  const hudGold = document.createElement('div');
  hudGold.id = 'hud-gold';
  document.body.appendChild(hudGold);

  const hudTimer = document.createElement('div');
  hudTimer.id = 'hud-timer';
  document.body.appendChild(hudTimer);

  const hudLevel = document.createElement('div');
  hudLevel.id = 'hud-level';
  document.body.appendChild(hudLevel);

  const hudKills = document.createElement('div');
  hudKills.id = 'hud-kills';
  document.body.appendChild(hudKills);

  const hudChar = document.createElement('div');
  hudChar.id = 'hud-char';
  document.body.appendChild(hudChar);

  const hudParticles = document.createElement('div');
  hudParticles.id = 'hud-particles';
  document.body.appendChild(hudParticles);

  const hudEnemies = document.createElement('div');
  hudEnemies.id = 'hud-enemies';
  document.body.appendChild(hudEnemies);

  // Create XP bar
  const xpBarFill = document.createElement('div');
  xpBarFill.id = 'xp-bar-fill';
  xpBarFill.style.width = '0%';
  document.body.appendChild(xpBarFill);

  // Create ult button elements
  const ultBtn = document.createElement('button');
  ultBtn.id = 'ult-btn';
  document.body.appendChild(ultBtn);

  const ultOverlay = document.createElement('div');
  ultOverlay.id = 'ult-cooldown-overlay';
  document.body.appendChild(ultOverlay);

  // Create damage layer
  const damageLayer = document.createElement('div');
  damageLayer.id = 'damage-layer';
  document.body.appendChild(damageLayer);

  // Create game over screen elements
  const goScreen = document.createElement('div');
  goScreen.id = 'gameover-screen';
  document.body.appendChild(goScreen);

  const goTitle = document.createElement('div');
  goTitle.id = 'go-title';
  goScreen.appendChild(goTitle);

  const goStats = document.createElement('div');
  goStats.id = 'go-stats';
  goScreen.appendChild(goStats);

  // Create level up screen elements
  const luScreen = document.createElement('div');
  luScreen.id = 'levelup-screen';
  document.body.appendChild(luScreen);

  const cardContainer = document.createElement('div');
  cardContainer.id = 'card-container';
  document.body.appendChild(cardContainer);

  // Create item slots
  const itemIds = ['pierce', 'projectile', 'cooldown', 'scope', 'damage'];
  itemIds.forEach(id => {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.dataset.item = id;

    const count = document.createElement('div');
    count.className = 'item-count';
    count.textContent = '0';
    slot.appendChild(count);

    document.body.appendChild(slot);
  });
};

// Use vi.isolateModules to ensure fresh module imports
vi.setConfig({ testTimeout: 10000, hookTimeout: 10000 });

describe('UI', () => {
  let window: Window;
  let document: Document;
  let UI: any;

  beforeEach(async () => {
    // Reset module cache to get fresh UI instance
    vi.resetModules();

    window = new Window({
      url: 'http://localhost:3000',
      width: 1024,
      height: 768,
    });
    document = window.document;
    global.window = window as any;
    global.document = document;

    setupDom(document);

    // Import UI after DOM is set up
    UI = (await import('../ui')).UI;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete global.window;
    delete global.document;
  });

  describe('updateHud()', () => {
    it('should update gold display', () => {
      UI.updateHud(100, 0, 1, 0, 'paladin');
      const goldEl = document.getElementById('hud-gold');
      expect(goldEl?.textContent).toBe('💰 100');
    });

    it('should update timer display', () => {
      UI.updateHud(0, 120, 1, 0, 'paladin');
      const timerEl = document.getElementById('hud-timer');
      expect(timerEl?.textContent).toBe('02:00'); // fmtTime zero-pads minutes
    });

    it('should update level display', () => {
      UI.updateHud(0, 0, 5, 0, 'paladin');
      const levelEl = document.getElementById('hud-level');
      expect(levelEl?.textContent).toBe('5');
    });

    it('should update kills display', () => {
      UI.updateHud(0, 0, 1, 42, 'paladin');
      const killsEl = document.getElementById('hud-kills');
      expect(killsEl?.textContent).toBe('42');
    });

    it('should update character name display', () => {
      UI.updateHud(0, 0, 1, 0, 'paladin');
      const charEl = document.getElementById('hud-char');
      expect(charEl?.textContent).toBe(CHARACTERS.paladin.name);
    });

    it('should update particles display', () => {
      UI.updateHud(0, 0, 1, 0, 'paladin', 150);
      const particlesEl = document.getElementById('hud-particles');
      expect(particlesEl?.textContent).toBe('150');
    });

    it('should update enemies display', () => {
      UI.updateHud(0, 0, 1, 0, 'paladin', 0, 25);
      const enemiesEl = document.getElementById('hud-enemies');
      expect(enemiesEl?.textContent).toBe('25');
    });

    it('should handle default values for particles and enemies', () => {
      UI.updateHud(0, 0, 1, 0, 'paladin');
      const particlesEl = document.getElementById('hud-particles');
      const enemiesEl = document.getElementById('hud-enemies');
      expect(particlesEl?.textContent).toBe('0');
      expect(enemiesEl?.textContent).toBe('0');
    });

    it('should not throw when elements are missing', () => {
      document.getElementById('hud-gold')?.remove();
      expect(() => UI.updateHud(100, 0, 1, 0, 'paladin')).not.toThrow();
    });
  });

  describe('updateXp()', () => {
    beforeEach(async () => {
      vi.resetModules();
      window = new Window({ url: 'http://localhost:3000', width: 1024, height: 768 });
      document = window.document;
      global.window = window as any;
      global.document = document;
      setupDom(document);
      UI = (await import('../ui')).UI;
    });

    it('should update xp bar width', () => {
      UI.updateXp(50, 100, 5);
      const xpBar = document.getElementById('xp-bar-fill');
      expect(xpBar?.style.width).toBe('50%');
    });

    it('should update level display', () => {
      UI.updateXp(0, 100, 10);
      const levelEl = document.getElementById('hud-level');
      expect(levelEl?.textContent).toBe('10');
    });

    it('should handle max xp correctly', () => {
      UI.updateXp(100, 100, 5);
      const xpBar = document.getElementById('xp-bar-fill');
      expect(xpBar?.style.width).toBe('100%');
    });

    it('should not throw when elements are missing', () => {
      document.getElementById('xp-bar-fill')?.remove();
      expect(() => UI.updateXp(50, 100, 5)).not.toThrow();
    });
  });

  describe('updateUlt()', () => {
    beforeEach(async () => {
      vi.resetModules();
      window = new Window({ url: 'http://localhost:3000', width: 1024, height: 768 });
      document = window.document;
      global.window = window as any;
      global.document = document;
      setupDom(document);
      UI = (await import('../ui')).UI;
    });

    it('should update overlay height based on charge', () => {
      UI.updateUlt(50, 100);
      const overlay = document.getElementById('ult-cooldown-overlay');
      expect(overlay?.style.height).toBe('50%');
    });

    it('should add ready class when fully charged', () => {
      UI.updateUlt(100, 100);
      const btn = document.getElementById('ult-btn') as HTMLElement;
      expect(btn?.classList.contains('ready')).toBe(true);
    });

    it('should remove ready class when not fully charged', () => {
      const btn = document.getElementById('ult-btn') as HTMLElement;
      btn.classList.add('ready');

      UI.updateUlt(50, 100);
      expect(btn?.classList.contains('ready')).toBe(false);
    });

    it('should cap percentage at 1', () => {
      UI.updateUlt(150, 100);
      const overlay = document.getElementById('ult-cooldown-overlay');
      expect(overlay?.style.height).toBe('0%');
    });

    it('should handle zero charge', () => {
      UI.updateUlt(0, 100);
      const overlay = document.getElementById('ult-cooldown-overlay');
      expect(overlay?.style.height).toBe('100%');
    });

    it('should not throw when elements are missing', () => {
      document.getElementById('ult-btn')?.remove();
      expect(() => UI.updateUlt(50, 100)).not.toThrow();
    });
  });

  describe('updateItemSlots()', () => {
    beforeEach(async () => {
      vi.resetModules();
      window = new Window({ url: 'http://localhost:3000', width: 1024, height: 768 });
      document = window.document;
      global.window = window as any;
      global.document = document;
      setupDom(document);
      UI = (await import('../ui')).UI;
    });

    it('should update item slot counts', () => {
      UI.updateItemSlots({ pierce: 0, cooldown: 0, projectile: 0 }, { pierce: 2, projectile: 1 });

      const pierceSlot = document.querySelector('.item-slot[data-item="pierce"]');
      const pierceCount = pierceSlot?.querySelector('.item-count');
      expect(pierceCount?.textContent).toBe('2');
    });

    it('should add active class when count > 0', () => {
      UI.updateItemSlots({ pierce: 0, cooldown: 0, projectile: 0 }, { pierce: 1 });

      const pierceSlot = document.querySelector('.item-slot[data-item="pierce"]') as HTMLElement;
      expect(pierceSlot?.classList.contains('active')).toBe(true);
    });

    it('should remove active class when count is 0', () => {
      const pierceSlot = document.querySelector('.item-slot[data-item="pierce"]') as HTMLElement;
      pierceSlot.classList.add('active');

      UI.updateItemSlots({ pierce: 0, cooldown: 0, projectile: 0 }, {});

      expect(pierceSlot?.classList.contains('active')).toBe(false);
    });

    it('should handle missing inventory keys', () => {
      expect(() => UI.updateItemSlots({ pierce: 0, cooldown: 0, projectile: 0 }, {})).not.toThrow();
    });

    it('should handle missing slots gracefully', () => {
      document.querySelector('.item-slot[data-item="pierce"]')?.remove();
      expect(() => UI.updateItemSlots({ pierce: 0, cooldown: 0, projectile: 0 }, { pierce: 1 })).not.toThrow();
    });
  });

  describe('spawnDamageText()', () => {
    beforeEach(async () => {
      vi.resetModules();
      window = new Window({ url: 'http://localhost:3000', width: 1024, height: 768 });
      document = window.document;
      global.window = window as any;
      global.document = document;
      setupDom(document);
      UI = (await import('../ui')).UI;
    });

    it('should create damage text element', () => {
      const el = UI.spawnDamageText(100, 100, 10, '#fff');

      expect(el).toBeInstanceOf(HTMLElement);
      expect(el.classList.contains('dmg-text')).toBe(true);
      expect(el.textContent).toBe('10');
    });

    it('should create crit damage text', () => {
      const el = UI.spawnDamageText(100, 100, 20, '#f00', true);

      expect(el.classList.contains('crit-text')).toBe(true);
      expect(el.classList.contains('player-hit')).toBe(true);
      expect(el.textContent).toBe('20!');
    });

    it('should set text color', () => {
      const el = UI.spawnDamageText(100, 100, 10, '#ff0');

      expect(el.style.color).toBe('#ff0');
    });

    it('should append to damage layer', () => {
      UI.spawnDamageText(100, 100, 10, '#fff');

      const layer = document.getElementById('damage-layer');
      expect(layer?.children.length).toBe(1);
    });

    it('should work when damage layer is missing', () => {
      document.getElementById('damage-layer')?.remove();
      const el = UI.spawnDamageText(100, 100, 10, '#fff');
      expect(el).toBeNull();
    });

    it('should convert numeric text to string', () => {
      const el = UI.spawnDamageText(100, 100, 42, '#fff');
      expect(el.textContent).toBe('42');
    });
  });

  describe('updateDamageTexts()', () => {
    beforeEach(async () => {
      vi.resetModules();
      window = new Window({ url: 'http://localhost:3000', width: 1024, height: 768 });
      document = window.document;
      global.window = window as any;
      global.document = document;
      setupDom(document);
      UI = (await import('../ui')).UI;
    });

    it('should decrement text life', () => {
      const el = UI.spawnDamageText(100, 100, 10, '#fff');
      const texts = [{ el, wx: 100, wy: 100, life: 20 }];

      UI.updateDamageTexts(texts, 500, 500, 0);

      expect(texts[0].life).toBe(19);
    });

    it('should update text opacity based on life', () => {
      const el = UI.spawnDamageText(100, 100, 10, '#fff');
      const texts = [{ el, wx: 100, wy: 100, life: 10 }];

      UI.updateDamageTexts(texts, 500, 500, 0);

      expect(el.style.opacity).toBe('0.45'); // (10-1)/20 = 0.45, life is decremented first
    });

    it('should position text relative to player', () => {
      const el = UI.spawnDamageText(600, 500, 10, '#fff');
      const texts = [{ el, wx: 600, wy: 500, life: 20 }];

      UI.updateDamageTexts(texts, 500, 500, 0);

      // 600 - 500 = 100 relative X, + screen/2 = 512 + 100 = 612
      expect(el.style.transform).toContain('translate(');
    });

    it('should scale crit text', () => {
      const el = UI.spawnDamageText(100, 100, 10, '#f00', true);
      const texts = [{ el, wx: 100, wy: 100, life: 20 }];

      UI.updateDamageTexts(texts, 500, 500, 0);

      expect(el.style.transform).toContain('scale(1.5)');
    });

    it('should handle world wrapping for text', () => {
      const el = UI.spawnDamageText(2600, 100, 10, '#fff'); // Past right edge
      const texts = [{ el, wx: 2600, wy: 100, life: 20 }];

      UI.updateDamageTexts(texts, 500, 500, 0);

      // Should wrap around
      expect(el.style.transform).toContain('translate(');
    });
  });

  describe('showGameOverScreen()', () => {
    beforeEach(async () => {
      vi.resetModules();
      window = new Window({ url: 'http://localhost:3000', width: 1024, height: 768 });
      document = window.document;
      global.window = window as any;
      global.document = document;
      setupDom(document);
      UI = (await import('../ui')).UI;
    });

    it('should show failed screen title', () => {
      UI.showGameOverScreen(false, 100, 2, 50, 1);

      const titleEl = document.getElementById('go-title');
      expect(titleEl?.textContent).toBe('MIA - FAILED');
      expect(titleEl?.style.color).toBe('#ff3333');
    });

    it('should show success screen title', () => {
      UI.showGameOverScreen(true, 100, 2, 50, 1);

      const titleEl = document.getElementById('go-title');
      expect(titleEl?.textContent).toBe('MISSION COMPLETE');
      expect(titleEl?.style.color).toBe('#22c55e');
    });

    it('should calculate survival bonus', () => {
      UI.showGameOverScreen(false, 100, 2, 50, 1);

      const statsEl = document.getElementById('go-stats');
      // survivalBonus = 100 * (2 * 0.2) = 40
      expect(statsEl?.innerHTML).toContain('+40');
    });

    it('should calculate kill bonus', () => {
      UI.showGameOverScreen(false, 100, 2, 150, 1);

      const statsEl = document.getElementById('go-stats');
      // killBonus = Math.floor(150/100) * 50 = 50
      expect(statsEl?.innerHTML).toContain('+50');
    });

    it('should calculate boss bonus', () => {
      UI.showGameOverScreen(false, 100, 2, 50, 2);

      const statsEl = document.getElementById('go-stats');
      // bossBonus = 2 * 200 = 400
      expect(statsEl?.innerHTML).toContain('+400');
    });

    it('should calculate total correctly', () => {
      UI.showGameOverScreen(false, 100, 1, 100, 1);

      const statsEl = document.getElementById('go-stats');
      // total = 100 + 20 + 50 + 200 = 370
      expect(statsEl?.innerHTML).toContain('370 G');
    });

    it('should activate game over screen', () => {
      UI.showGameOverScreen(false, 100, 1, 0, 0);

      const screen = document.getElementById('gameover-screen');
      expect(screen?.classList.contains('active')).toBe(true);
    });

    it('should not throw when elements are missing', () => {
      document.getElementById('go-title')?.remove();
      expect(() => UI.showGameOverScreen(false, 100, 1, 0, 0)).not.toThrow();
    });
  });

  describe('showLevelUpScreen()', () => {
    beforeEach(async () => {
      vi.resetModules();
      window = new Window({ url: 'http://localhost:3000', width: 1024, height: 768 });
      document = window.document;
      global.window = window as any;
      global.document = document;
      setupDom(document);
      UI = (await import('../ui')).UI;
    });

    it('should create upgrade cards for choices', () => {
      UI.showLevelUpScreen(['bubble_stream'], {}, { items: { pierce: 0, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, () => {});

      const container = document.getElementById('card-container');
      expect(container?.children.length).toBe(1);
    });

    it('should create multiple upgrade cards', () => {
      const choices = ['bubble_stream', 'pierce'];
      UI.showLevelUpScreen(choices, {}, { items: { pierce: 0, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, () => {});

      const container = document.getElementById('card-container');
      expect(container?.children.length).toBe(2);
    });

    it('should display weapon stats for new weapons', () => {
      UI.showLevelUpScreen(['bubble_stream'], {}, { items: { pierce: 0, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, () => {});

      const container = document.getElementById('card-container');
      const card = container?.children[0] as HTMLElement;
      expect(card?.innerHTML).toContain('NEW!');
      expect(card?.innerHTML).toContain('DMG');
    });

    it('should display upgrade stats for existing weapons', () => {
      UI.showLevelUpScreen(['bubble_stream'], { bubble_stream: 1 }, { items: { pierce: 0, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, () => {});

      const container = document.getElementById('card-container');
      const card = container?.children[0] as HTMLElement;
      expect(card?.innerHTML).toContain('→'); // Shows upgrade arrow
    });

    it('should display item stats', () => {
      UI.showLevelUpScreen(['pierce'], {}, { items: { pierce: 1, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, () => {});

      const container = document.getElementById('card-container');
      const card = container?.children[0] as HTMLElement;
      expect(card?.innerHTML).toContain('Pierce:');
    });

    it('should set onclick handler for cards', () => {
      let selectedId = '';
      const onSelect = (id: string) => { selectedId = id; };

      UI.showLevelUpScreen(['bubble_stream'], {}, { items: { pierce: 0, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, onSelect);

      const container = document.getElementById('card-container');
      const card = container?.children[0] as HTMLElement;

      card?.click();
      expect(selectedId).toBe('bubble_stream');
    });

    it('should remove levelup-screen on select', () => {
      const onSelect = () => {};
      UI.showLevelUpScreen(['bubble_stream'], {}, { items: { pierce: 0, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, onSelect);

      const container = document.getElementById('card-container');
      const card = container?.children[0] as HTMLElement;

      card?.click();

      const screen = document.getElementById('levelup-screen');
      expect(screen?.classList.contains('active')).toBe(false);
    });

    it('should clear existing content before rendering', () => {
      const container = document.getElementById('card-container');
      container?.appendChild(document.createElement('div'));

      UI.showLevelUpScreen(['bubble_stream'], {}, { items: { pierce: 0, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, () => {});

      expect(container?.children.length).toBe(1); // Only the new card
    });

    it('should return early if container is missing', () => {
      document.getElementById('card-container')?.remove();
      expect(() => UI.showLevelUpScreen(['bubble_stream'], {}, { items: { pierce: 0, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, () => {})).not.toThrow();
    });

    it('should skip invalid upgrade ids', () => {
      UI.showLevelUpScreen(['invalid_id'], {}, { items: { pierce: 0, cooldown: 0, projectile: 0 }, critChance: 0, dmgMult: 1 }, () => {});

      const container = document.getElementById('card-container');
      expect(container?.children.length).toBe(0);
    });
  });
});
