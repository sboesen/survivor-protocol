import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Renderer } from '../renderer';

// Mock the palette and sprites at the top level
vi.mock('../../assets/palette', () => ({
  PALETTE: {
    '.': null,
    '1': '#475569',
    'r': '#ef4444',
    'b': '#3b82f6',
  },
}));

vi.mock('../../assets/sprites', () => ({
  SPRITES: {
    janitor: [
      '   1111   ',
      '  111111  ',
      '  11rr11  ',
      '  111111  ',
      ' 11111111 ',
      ' 111b1b11 ',
      ' 111b1b11 ',
      '    11    ',
      '   1  1   ',
      '   1111   ',
    ],
  },
}));

describe('Renderer', () => {
  const createMockCtx = () => {
    const mockCtx: any = {
      fillStyle: '',
      globalAlpha: 1,
      beginPath: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      ellipse: vi.fn(),
    };
    return mockCtx;
  };

  describe('drawSprite', () => {
    it('should be a singleton', () => {
      expect(Renderer).toBeDefined();
      expect(typeof Renderer.drawSprite).toBe('function');
    });

    it('should handle missing sprite key gracefully', () => {
      const mockCtx = createMockCtx();
      expect(() => Renderer.drawSprite(mockCtx, 'nonexistent', 100, 100, 2)).not.toThrow();
    });

    it('should draw shadow when shadow is true', () => {
      const mockCtx = createMockCtx();
      Renderer.drawSprite(mockCtx, 'janitor', 100, 100, 2, 1, true);

      // Shadow should be drawn (check that ellipse was called)
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.ellipse).toHaveBeenCalledWith(
        100,
        108, // y + scale * 4
        8,   // scale * 4
        4,   // scale * 2
        0,
        0,
        Math.PI * 2
      );
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should not draw shadow when shadow is false', () => {
      const mockCtx = createMockCtx();
      Renderer.drawSprite(mockCtx, 'janitor', 100, 100, 2, 1, false);

      // Shadow should not be drawn
      expect(mockCtx.ellipse).not.toHaveBeenCalled();
    });

    it('should set and reset globalAlpha', () => {
      const mockCtx = createMockCtx();
      Renderer.drawSprite(mockCtx, 'janitor', 100, 100, 2, 0.5, true);

      // After drawing, globalAlpha should be reset to 1.0
      expect(mockCtx.globalAlpha).toBe(1.0);
    });

    it('should reset globalAlpha to 1.0 after drawing', () => {
      const mockCtx = createMockCtx();
      Renderer.drawSprite(mockCtx, 'janitor', 100, 100, 2);

      expect(mockCtx.globalAlpha).toBe(1.0);
    });

    it('should draw pixels with correct scale', () => {
      const mockCtx = createMockCtx();
      Renderer.drawSprite(mockCtx, 'janitor', 100, 100, 3);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const calls = mockCtx.fillRect.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Check that scale is applied correctly
      const firstCall = calls[0];
      expect(firstCall[2]).toBe(3); // width = scale
      expect(firstCall[3]).toBe(3); // height = scale
    });

    it('should handle scale of 1', () => {
      const mockCtx = createMockCtx();
      Renderer.drawSprite(mockCtx, 'janitor', 100, 100, 1);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const calls = mockCtx.fillRect.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const firstCall = calls[0];
      expect(firstCall[2]).toBe(1); // width = scale
      expect(firstCall[3]).toBe(1); // height = scale
    });

    it('should skip null palette entries', () => {
      const mockCtx = createMockCtx();
      Renderer.drawSprite(mockCtx, 'janitor', 100, 100, 2);

      // The sprite has spaces (null palette entries) that should be skipped
      const fillRectCalls = mockCtx.fillRect.mock.calls;
      expect(fillRectCalls.length).toBeGreaterThan(0);
      expect(fillRectCalls.length).toBeLessThan(100); // Not all 100 pixels
    });

    it('should handle different sprite positions', () => {
      const mockCtx = createMockCtx();

      Renderer.drawSprite(mockCtx, 'janitor', 0, 0, 2);
      expect(mockCtx.fillRect).toHaveBeenCalled();

      Renderer.drawSprite(mockCtx, 'janitor', 500, 500, 2);
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should handle negative coordinates', () => {
      const mockCtx = createMockCtx();
      expect(() => Renderer.drawSprite(mockCtx, 'janitor', -100, -100, 2)).not.toThrow();
    });
  });
});
