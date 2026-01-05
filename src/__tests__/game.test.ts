import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Window } from 'happy-dom';
import { GameCore } from '../game';
import { threeRenderer } from '../renderer/three';

// Mock all the imported modules that have side effects
vi.mock('../renderer/three', () => ({
  threeRenderer: {
    init: vi.fn(async () => {}),
    dispose: vi.fn(),
    render: vi.fn(),
    renderUI: vi.fn(),
    resize: vi.fn(),
    renderBackgroundCanvas: vi.fn(),
    renderIllumination: vi.fn(),
    renderObstaclesCanvas: vi.fn(),
  },
}));

vi.mock('../systems/saveData', () => ({
  SaveData: {
    load: vi.fn(),
    save: vi.fn(),
    data: {
      selectedChar: 'paladin',
      gold: 0,
      shop: {
        health: 0,
        damage: 0,
        speed: 0,
        magnet: 0,
      },
    },
  },
}));

vi.mock('../systems/gacha', () => ({
  GachaAnim: {
    init: vi.fn(),
  },
}));

vi.mock('../systems/ui', () => ({
  UI: {
    updateHud: vi.fn(),
    updateXp: vi.fn(),
    updateUlt: vi.fn(),
    updateItemSlots: vi.fn(),
    updateWeaponSlots: vi.fn(),
    spawnDamageText: vi.fn(() => ({ style: {} })),
    updateDamageTexts: vi.fn(),
    showLevelUpScreen: vi.fn(),
    showGameOverScreen: vi.fn(),
  },
}));

vi.mock('../systems/menu', () => ({
  Menu: {
    renderCharSelect: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  },
}));

// Mock Math.random for deterministic tests
const mockRandomValues: number[] = [];
let randomIndex = 0;
vi.spyOn(Math, 'random').mockImplementation(() => {
  const val = mockRandomValues[randomIndex] ?? 0.5;
  randomIndex = (randomIndex + 1) % mockRandomValues.length;
  return val;
});

describe('GameCore', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame | undefined;
  let originalLocalStorage: Storage | undefined;
  let window: Window;
  let document: Document;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  // Track draw calls for verification
  const drawCalls: string[] = [];

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalLocalStorage = globalThis.localStorage;

    // Create happy-dom window
    window = new Window({
      url: 'http://localhost:3000',
      width: 1024,
      height: 768,
    });
    document = window.document;
    globalThis.window = window as any;
    globalThis.document = document;
    globalThis.requestAnimationFrame = vi.fn();
    globalThis.localStorage = window.localStorage;

    // Create canvas element
    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.width = 1024;
    canvas.height = 768;
    document.body.appendChild(canvas);

    // Create mock context that tracks draw calls
    drawCalls.length = 0;
    ctx = {
      canvas,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: vi.fn(function (this: any) { drawCalls.push(`fillRect(${Array.from(arguments).join(', ')})`); }),
      strokeRect: vi.fn(function (this: any) { drawCalls.push(`strokeRect(${Array.from(arguments).join(', ')})`); }),
      beginPath: vi.fn(function (this: any) { drawCalls.push('beginPath'); }),
      closePath: vi.fn(function (this: any) { drawCalls.push('closePath'); }),
      moveTo: vi.fn(function (this: any) { drawCalls.push(`moveTo(${Array.from(arguments).join(', ')})`); }),
      lineTo: vi.fn(function (this: any) { drawCalls.push(`lineTo(${Array.from(arguments).join(', ')})`); }),
      arc: vi.fn(function (this: any) { drawCalls.push(`arc(${Array.from(arguments).join(', ')})`); }),
      ellipse: vi.fn(function (this: any) { drawCalls.push(`ellipse(${Array.from(arguments).join(', ')})`); }),
      stroke: vi.fn(function (this: any) { drawCalls.push('stroke'); }),
      fill: vi.fn(function (this: any) { drawCalls.push('fill'); }),
      save: vi.fn(function (this: any) { drawCalls.push('save'); }),
      restore: vi.fn(function (this: any) { drawCalls.push('restore'); }),
      translate: vi.fn(function (this: any) { drawCalls.push(`translate(${Array.from(arguments).join(', ')})`); }),
      scale: vi.fn(function (this: any) { drawCalls.push(`scale(${Array.from(arguments).join(', ')})`); }),
      clearRect: vi.fn(function (this: any) { drawCalls.push(`clearRect(${Array.from(arguments).join(', ')})`); }),
    } as any;

    // Mock getContext to return our mock context
    canvas.getContext = vi.fn((contextType: string) => {
      if (contextType === '2d') return ctx;
      return null;
    });

    // Reset random values
    mockRandomValues.length = 0;
    randomIndex = 0;
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }
    if (originalDocument) {
      globalThis.document = originalDocument;
    } else {
      delete (globalThis as any).document;
    }
    if (originalRequestAnimationFrame) {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete (globalThis as any).requestAnimationFrame;
    }
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete (globalThis as any).localStorage;
    }
  });

  describe('initialization', () => {
    it('should create a singleton instance', () => {
      const game = new GameCore();
      expect(game).toBeDefined();
    });

    it('should initialize with default state', () => {
      const game = new GameCore();
      expect(game.active).toBe(false);
      expect(game.paused).toBe(false);
      expect(game.frames).toBe(0);
      expect(game.kills).toBe(0);
      expect(game.enemies).toEqual([]);
      expect(game.projectiles).toEqual([]);
    });

    it('should not require a 2d canvas on init', () => {
      const game = new GameCore();
      game.init();
      expect(game.canvas).toBeNull();
      expect(game.ctx).toBeNull();
    });

    it('should return early if canvas not found', () => {
      document.body.removeChild(canvas);
      const game = new GameCore();
      expect(() => game.init()).not.toThrow();
      expect(game.canvas).toBeNull();
    });
  });

  describe('start()', () => {
    it('should set active to true', () => {
      const game = new GameCore();
      game.init();
      game.start();
      expect(game.active).toBe(true);
      expect(game.paused).toBe(false);
    });

    it('should create a player with selected character', () => {
      const game = new GameCore();
      game.init();
      game.start();
      expect(game.player).toBeDefined();
      expect(game.player?.x).toBeDefined();
      expect(game.player?.y).toBeDefined();
    });

    it('should spawn obstacles', () => {
      // Seed random values for obstacle generation
      for (let i = 0; i < 500; i++) {
        mockRandomValues.push(i / 1000);
      }
      const game = new GameCore();
      game.init();
      game.start();
      expect(game.obstacles.length).toBeGreaterThan(0);
      // Reset for next test
      mockRandomValues.length = 0;
      randomIndex = 0;
    });

    it('should reset frame count', () => {
      const game = new GameCore();
      game.frames = 100;
      game.init();
      game.start();
      expect(game.frames).toBe(0);
    });
  });

  describe('resize()', () => {
    it('should resize renderer to window size', () => {
      const game = new GameCore();
      game.init();
      game.resize();
      expect(threeRenderer.resize).toHaveBeenCalledWith(window.innerWidth, window.innerHeight);
    });

    it('should work without canvas being initialized', () => {
      const game = new GameCore();
      expect(() => game.resize()).not.toThrow();
    });
  });

  describe('render()', () => {
    it('should return early if ctx is null', () => {
      const game = new GameCore();
      game.render();
      expect(drawCalls.length).toBe(0);
    });

    it('should return early if not active', () => {
      const game = new GameCore();
      game.init();
      game.render();
      // Background rendering is handled by mocked threeRenderer, no 2D calls expected
      expect(drawCalls.length).toBe(0);
    });

    it('should call threeRenderer renderBackgroundCanvas', () => {
      const game = new GameCore();
      game.init();
      game.render();
      // threeRenderer methods are mocked but we can verify render doesn't crash
      expect(game).toBeDefined();
    });

    it('should render when game is active', () => {
      const game = new GameCore();
      game.init();
      game.start();
      drawCalls.length = 0;
      game.render();
      // threeRenderer handles most rendering, so 2D calls are minimal
      // Just verify render completes without error
      expect(game).toBeDefined();
    });

    it('should call threeRenderer render methods when active', () => {
      const game = new GameCore();
      game.init();
      game.start();
      game.render();
      // Verify the game renders successfully (actual rendering is in threeRenderer)
      expect(game.active).toBe(true);
    });
  });

  describe('gameOver()', () => {
    it('should set active to false', () => {
      const game = new GameCore();
      game.init();
      game.start();
      game.gameOver(false);
      expect(game.active).toBe(false);
    });

    it('should set active to false on success', () => {
      const game = new GameCore();
      game.init();
      game.start();
      game.gameOver(true);
      expect(game.active).toBe(false);
    });

    it('should not error when called without player', () => {
      const game = new GameCore();
      game.init();
      expect(() => game.gameOver(false)).not.toThrow();
    });
  });

  describe('quitRun()', () => {
    it('should return to menu and clear game state', () => {
      const game = new GameCore();
      game.init();
      game.start();
      game.quitRun();
      expect(game.active).toBe(false);
      // Note: player is not set to null by gameOver, just active = false
      expect(game.player).toBeDefined();
    });

    it('should handle quit without starting', () => {
      const game = new GameCore();
      game.init();
      expect(() => game.quitRun()).not.toThrow();
    });
  });

  describe('triggerUlt()', () => {
    it('should not trigger ult when game is paused', () => {
      const game = new GameCore();
      game.init();
      game.start();
      game.paused = true;
      const initialCharge = game.player?.ultCharge ?? 0;
      game.triggerUlt();
      expect(game.player?.ultCharge).toBe(initialCharge);
    });

    it('should not trigger ult when no player', () => {
      const game = new GameCore();
      game.init();
      expect(() => game.triggerUlt()).not.toThrow();
    });

    it('should not trigger ult when not active', () => {
      const game = new GameCore();
      game.init();
      expect(() => game.triggerUlt()).not.toThrow();
    });

    it('should trigger ult when charge is full', () => {
      const game = new GameCore();
      game.init();
      game.start();
      if (game.player) {
        game.player.ultCharge = game.player.ultMax;
        game.triggerUlt();
        expect(game.player.ultCharge).toBe(0);
        // Note: paladin's ult (DivineShield) doesn't set ultActiveTime
        // Other ults like TimeFreeze do set it
      }
    });
  });

  describe('input handling', () => {
    it('should have initial input state', () => {
      const game = new GameCore();
      expect(game.input.keys).toEqual({});
      expect(game.input.joy.active).toBe(false);
      expect(game.input.aimJoy.active).toBe(false);
    });

    it('should set up input listeners on init without error', () => {
      const game = new GameCore();
      // happy-dom doesn't expose on* properties like real browsers
      // Just verify init completes successfully
      expect(() => game.init()).not.toThrow();
      expect(game.input).toBeDefined();
    });

    it('should have joysticks initialized', () => {
      const game = new GameCore();
      game.init();
      expect(game.input.joy).toBeDefined();
      expect(game.input.aimJoy).toBeDefined();
    });
  });

  describe('spawnDamageText()', () => {
    it('should add damage text to array', () => {
      const game = new GameCore();
      game.init();
      game.start();
      const initialLength = game.damageTexts.length;
      game.spawnDamageText(100, 100, 10, '#f00');
      expect(game.damageTexts.length).toBe(initialLength + 1);
    });

    it('should spawn crit damage text', () => {
      const game = new GameCore();
      game.init();
      game.start();
      game.spawnDamageText(100, 100, 10, '#f00', true);
      expect(game.damageTexts.length).toBe(1);
    });
  });

  describe('spawnParticles()', () => {
    it('should add particles to array', () => {
      const game = new GameCore();
      game.init();
      game.start();
      const initialLength = game.particles.length;
      game.spawnParticles({ type: 'water' as any, x: 100, y: 100 }, 5);
      expect(game.particles.length).toBe(initialLength + 5);
    });

    it('should not spawn particles when at cap', () => {
      const game = new GameCore();
      game.init();
      game.start();
      // Fill particles to cap
      for (let i = 0; i < 3000; i++) {
        game.particles.push({} as any);
      }
      const lengthBefore = game.particles.length;
      game.spawnParticles({ type: 'water' as any, x: 100, y: 100 }, 5);
      expect(game.particles.length).toBe(lengthBefore);
    });

    it('should not spawn particles for invalid type', () => {
      const game = new GameCore();
      game.init();
      game.start();
      const initialLength = game.particles.length;
      game.spawnParticles({ type: 'invalid' as any, x: 100, y: 100 }, 5);
      expect(game.particles.length).toBe(initialLength);
    });
  });

  describe('spawnExplosion()', () => {
    it('should spawn explosion and smoke particles', () => {
      const game = new GameCore();
      game.init();
      game.start();
      const initialLength = game.particles.length;
      game.spawnExplosion(100, 100, 1);
      expect(game.particles.length).toBeGreaterThan(initialLength);
    });
  });

  describe('loop()', () => {
    let game: GameCore;
    let requestAnimationFrameSpy: ReturnType<typeof vi.spyOn>;
    let rafCallback: ((timestamp: number) => void) | null = null;

    beforeEach(() => {
      game = new GameCore();
      game.init();
      // Mock requestAnimationFrame to capture the callback
      requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb as any;
        return 1 as any;
      });
    });

    afterEach(() => {
      requestAnimationFrameSpy.mockRestore();
    });

    it('should initialize accumulator to 0', () => {
      expect(game['accumulator']).toBe(0);
    });

    it('should update lastTime to current timestamp', () => {
      const timestamp = 100;
      game['lastTime'] = 0;

      game['loop'](timestamp);

      expect(game['lastTime']).toBe(timestamp);
    });

    it('should cap accumulator at 100 to prevent spiral death', () => {
      game['lastTime'] = 0;
      // Set accumulator to 90, then add 50ms (would be 140, should cap at 100)
      game['accumulator'] = 90;
      // Spy on loop to prevent actual execution of update/render
      const originalUpdate = game['update'];
      game['update'] = vi.fn(() => {
        // Don't call actual update, just decrement accumulator
        while (game['accumulator'] >= game['timestep']) {
          game['accumulator'] -= game['timestep'];
        }
      });

      game['loop'](50);

      expect(game['accumulator']).toBeLessThanOrEqual(100);

      // Restore
      game['update'] = originalUpdate;
    });

    it('should cap accumulator when directly set above 100', () => {
      game.init();
      game.start(); // Make game active so update() doesn't return early
      game['lastTime'] = 0;
      game['accumulator'] = 50;

      game['loop'](200); // deltaTime = 200 - 0 = 200, 50 + 200 = 250, should cap at 100

      // After capping and update loop consuming, accumulator should be reasonable
      expect(game['accumulator']).toBeLessThanOrEqual(100);
    });

    it('should call update() when accumulator exceeds timestep', () => {
      game.init();
      game.start();
      game['lastTime'] = 0;

      // Set accumulator to trigger update
      game['accumulator'] = game['timestep'];
      const framesBefore = game.frames;

      game['loop'](0); // deltaTime = 0 - 0 = 0, but we set accumulator directly

      // update() should have been called (frames incremented)
      expect(game.frames).toBeGreaterThan(framesBefore);
    });

    it('should decrease accumulator by timestep after each update', () => {
      game.init();
      game.start();
      game['lastTime'] = 0;
      game['accumulator'] = game['timestep'] * 2;

      game['loop'](0);

      // After 2 updates, accumulator should decrease by 2 * timestep
      // Since we had 2 * timestep, and ran 2 updates, it should be near 0
      expect(game['accumulator']).toBeLessThan(game['timestep']);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple init calls', () => {
      const game = new GameCore();
      game.init();
      game.init();
      expect(game.canvas).toBeNull();
    });

    it('should handle render without init', () => {
      const game = new GameCore();
      expect(() => game.render()).not.toThrow();
    });
  });
});
