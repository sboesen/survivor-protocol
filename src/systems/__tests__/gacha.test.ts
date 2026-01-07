import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GachaAnim } from '../gacha';
import { SaveData } from '../saveData';
import { CHARACTERS } from '../../data/characters';

// Mock dependencies
vi.mock('../../data/characters', () => ({
  CHARACTERS: {
    paladin: { id: 'paladin', name: 'Paladin' },
    rogue: { id: 'rogue', name: 'Rogue' },
  },
}));

vi.mock('../saveData', () => ({
  SaveData: {
    data: {
      gold: 1000,
      ownedChars: ['paladin'],
    },
    save: vi.fn(),
  },
}));

vi.mock('../renderer', () => ({
  Renderer: {
    drawSprite: vi.fn(),
  },
}));

describe('GachaAnim', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: any;
  let mockElements: Record<string, any>;

  const createMockCtx = () => ({
    clearRect: vi.fn(),
    fillStyle: '',
    fillRect: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    font: '',
    lineWidth: 0,
    strokeStyle: '',
    globalAlpha: 1,
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  });

  beforeEach(() => {
    // Setup canvas mock
    mockCtx = createMockCtx();
    mockCanvas = {
      getContext: vi.fn(() => mockCtx),
    } as unknown as HTMLCanvasElement;

    // Setup DOM element mocks
    mockElements = {
      'gacha-canvas': mockCanvas,
      'gacha-gold': { textContent: '1000' },
      'pull-btn': { disabled: false },
      'gacha-back-btn': { disabled: false },
      'gacha-result': { textContent: '', innerHTML: '' },
    };

    vi.stubGlobal('document', {
      getElementById: vi.fn((id: string) => mockElements[id] || null),
      readyState: 'complete',
    });

    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      return setTimeout(cb, 16) as unknown as number;
    }));

    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    vi.stubGlobal('alert', vi.fn());

    // Reset SaveData mock
    (SaveData.data as any).gold = 1000;
    (SaveData.data as any).ownedChars = ['paladin'];

    // Reset GachaAnim state
    GachaAnim.active = false;
    GachaAnim.phase = 0;
    GachaAnim.frames = 0;
    GachaAnim.resultChar = null;
    GachaAnim.isDup = false;
    GachaAnim.particles = [];
    GachaAnim.animationId = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initialization', () => {
    it('should be a singleton', () => {
      expect(GachaAnim).toBeDefined();
    });

    it('should have initial state', () => {
      expect(GachaAnim.active).toBe(false);
      expect(GachaAnim.phase).toBe(0);
      expect(GachaAnim.frames).toBe(0);
      expect(GachaAnim.resultChar).toBeNull();
      expect(GachaAnim.particles).toEqual([]);
    });

    it('should initialize canvas and ctx on init', () => {
      GachaAnim.init();
      expect(GachaAnim.canvas).toBe(mockCanvas);
      expect(GachaAnim.ctx).toBe(mockCtx);
    });

    it('should draw idle state on init', () => {
      GachaAnim.init();
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });

  describe('drawIdle', () => {
    beforeEach(() => {
      mockCtx = createMockCtx();
      GachaAnim.ctx = mockCtx;
    });

    it('should clear canvas', () => {
      GachaAnim.drawIdle();
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
    });

    it('should draw background', () => {
      GachaAnim.drawIdle();
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 200, 200);
    });

    it('should draw circle', () => {
      GachaAnim.drawIdle();
      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 40, 0, Math.PI * 2);
    });

    it('should draw question mark', () => {
      GachaAnim.drawIdle();
      expect(mockCtx.fillText).toHaveBeenCalledWith('?', 92, 110);
    });

    it('should return early if no ctx', () => {
      GachaAnim.ctx = null;
      expect(() => GachaAnim.drawIdle()).not.toThrow();
    });
  });

  describe('startPull', () => {
    beforeEach(() => {
      GachaAnim.init();
      (SaveData.data as any).gold = 1000;
      (SaveData.data as any).ownedChars = ['paladin'];
      mockCtx = createMockCtx();
      GachaAnim.ctx = mockCtx;
    });

    it('should cancel existing animation if running', () => {
      GachaAnim.animationId = 123;
      GachaAnim.startPull();
      expect(cancelAnimationFrame).toHaveBeenCalledWith(123);
    });

    it('should alert and return if insufficient gold', () => {
      (SaveData.data as any).gold = 100;
      GachaAnim.startPull();
      expect(alert).toHaveBeenCalledWith('Insufficient Gold!');
      expect(GachaAnim.active).toBe(false);
    });

    it('should deduct 500 gold', () => {
      // Use a random value that's not 0 or 0.99 to get a non-duplicate
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      GachaAnim.startPull();
      expect(SaveData.data.gold).toBe(500);
      vi.mocked(Math.random).mockRestore();
    });

    it('should update gold display', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      GachaAnim.startPull();
      expect(mockElements['gacha-gold'].textContent).toBe('500');
      vi.mocked(Math.random).mockRestore();
    });

    it('should set result character from pool', () => {
      GachaAnim.startPull();
      expect(GachaAnim.resultChar).toBeDefined();
      expect(['paladin', 'rogue']).toContain(GachaAnim.resultChar?.id);
    });

    it('should detect duplicate character', () => {
      // Force result to be paladin (already owned)
      vi.spyOn(Math, 'random').mockReturnValue(0);
      GachaAnim.startPull();
      expect(GachaAnim.isDup).toBe(true);
    });

    it('should refund 250 gold for duplicate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      GachaAnim.startPull();
      expect(SaveData.data.gold).toBe(750); // 1000 - 500 + 250
    });

    it('should add new character to owned', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      GachaAnim.startPull();
      expect(SaveData.data.ownedChars).toContain('rogue');
    });

    it('should save after pull', () => {
      GachaAnim.startPull();
      expect(SaveData.save).toHaveBeenCalled();
    });

    it('should disable buttons during animation', () => {
      GachaAnim.startPull();
      expect(mockElements['pull-btn'].disabled).toBe(true);
      expect(mockElements['gacha-back-btn'].disabled).toBe(true);
    });

    it('should set initial result text', () => {
      GachaAnim.startPull();
      expect(mockElements['gacha-result'].textContent).toBe('Accessing Neural Net...');
    });

    it('should set active state and start animation', () => {
      GachaAnim.startPull();
      expect(GachaAnim.active).toBe(true);
      expect(GachaAnim.phase).toBe(1);
      // frames gets incremented by loop(), so it should be 1
      expect(GachaAnim.frames).toBe(1);
      expect(GachaAnim.particles).toEqual([]);
    });
  });

  describe('loop - phase 1', () => {
    beforeEach(() => {
      GachaAnim.init();
      mockCtx = createMockCtx();
      GachaAnim.ctx = mockCtx;
      GachaAnim.resultChar = { id: 'rogue', name: 'Rogue' };
      GachaAnim.active = true;
      GachaAnim.phase = 2;
      GachaAnim.frames = 0;
      GachaAnim.isDup = false;
    });

    it('should clear canvas and draw background', () => {
      GachaAnim.loop();
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should draw animated circle', () => {
      // Mock requestAnimationFrame to prevent infinite loop
      let callCount = 0;
      vi.stubGlobal('requestAnimationFrame', vi.fn(() => {
        callCount++;
        return 1;
      }));

      GachaAnim.loop();

      // The loop should have called requestAnimationFrame
      expect(callCount).toBe(1);

      vi.unstubAllGlobals();
    });

    it('should increment frames', () => {
      const initialFrames = GachaAnim.frames;
      GachaAnim.loop();
      expect(GachaAnim.frames).toBe(initialFrames + 1);
    });

    it('should transition to phase 2 after 60 frames', () => {
      GachaAnim.frames = 60;
      GachaAnim.loop();
      expect(GachaAnim.phase).toBe(2);
      expect(GachaAnim.frames).toBe(0);
    });

    it('should not loop if not active', () => {
      GachaAnim.active = false;
      GachaAnim.loop();
      expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('should not loop if no ctx', () => {
      GachaAnim.ctx = null;
      GachaAnim.loop();
      expect(requestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe('loop - phase 2', () => {
    beforeEach(() => {
      GachaAnim.init();
      GachaAnim.ctx = createMockCtx();
      GachaAnim.resultChar = { id: 'rogue', name: 'Skater' };
      GachaAnim.active = true;
      GachaAnim.phase = 2;
      GachaAnim.frames = 0;
      GachaAnim.isDup = false;
    });

    it('should draw fade overlay', () => {
      GachaAnim.loop();
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 200, 200);
    });

    it('should create particles on phase completion', () => {
      GachaAnim.frames = 20;
      GachaAnim.loop();
      expect(GachaAnim.particles.length).toBe(30);
    });

    it('should update result text for new character', () => {
      GachaAnim.frames = 20;
      GachaAnim.isDup = false;
      GachaAnim.loop();
      expect(mockElements['gacha-result'].innerHTML).toContain('UNLOCKED');
      expect(mockElements['gacha-result'].innerHTML).toContain('Rogue');
    });

    it('should update result text for duplicate', () => {
      GachaAnim.frames = 20;
      GachaAnim.isDup = true;
      GachaAnim.loop();
      expect(mockElements['gacha-result'].innerHTML).toContain('Dup');
    });

    it('should re-enable buttons', () => {
      GachaAnim.frames = 20;
      GachaAnim.loop();
      expect(mockElements['pull-btn'].disabled).toBe(false);
      expect(mockElements['gacha-back-btn'].disabled).toBe(false);
    });

    it('should transition to phase 3 after 20 frames', () => {
      GachaAnim.frames = 20;
      GachaAnim.loop();
      expect(GachaAnim.phase).toBe(3);
      expect(GachaAnim.frames).toBe(0);
    });
  });

  describe('loop - phase 3', () => {
    beforeEach(() => {
      GachaAnim.init();
      GachaAnim.ctx = createMockCtx();
      GachaAnim.resultChar = { id: 'rogue', name: 'Rogue' };
      GachaAnim.active = true;
      GachaAnim.phase = 3;
      GachaAnim.frames = 0;
      GachaAnim.particles = [
        { x: 100, y: 100, vx: 1, vy: 1, life: 1, c: '#fbbf24' },
        { x: 100, y: 100, vx: -1, vy: -1, life: 0.5, c: '#ef4444' },
      ];
    });

    it('should update particle positions', () => {
      GachaAnim.loop();
      expect(GachaAnim.particles[0].x).toBe(101);
      expect(GachaAnim.particles[0].y).toBe(101);
    });

    it('should decrease particle life', () => {
      GachaAnim.loop();
      expect(GachaAnim.particles[0].life).toBeCloseTo(0.98, 2);
    });

    it('should draw particles', () => {
      GachaAnim.loop();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should end animation after 60 frames', () => {
      GachaAnim.frames = 60;
      GachaAnim.loop();
      expect(GachaAnim.active).toBe(false);
    });
  });
});
