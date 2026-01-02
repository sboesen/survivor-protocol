import { describe, it, expect } from 'vitest';
import { PALETTE } from '../palette';

describe('PALETTE', () => {
  it('should export a palette object', () => {
    expect(PALETTE).toBeDefined();
    expect(typeof PALETTE).toBe('object');
  });

  it('should have all expected color keys', () => {
    const expectedKeys = ['.', 's', 'b', 'd', 'g', 'r', 'p', 'w', '1', '2', '3', 'k', 'e'];
    expectedKeys.forEach(key => {
      expect(PALETTE).toHaveProperty(key);
    });
  });

  it('should map null to . key', () => {
    expect(PALETTE['.']).toBeNull();
  });

  it('should have valid hex color values for color keys', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{3,6}$/;
    const colorKeys = ['s', 'b', 'd', 'g', 'r', 'p', 'w', '1', '2', '3', 'k', 'e'];

    colorKeys.forEach(key => {
      const value = PALETTE[key];
      expect(value).toMatch(hexColorRegex);
    });
  });

  it('should have correct silver color', () => {
    expect(PALETTE['s']).toBe('#94a3b8');
  });

  it('should have correct blue color', () => {
    expect(PALETTE['b']).toBe('#3b82f6');
  });

  it('should have correct dark color', () => {
    expect(PALETTE['d']).toBe('#1e293b');
  });

  it('should have correct gold color', () => {
    expect(PALETTE['g']).toBe('#fbbf24');
  });

  it('should have correct red color', () => {
    expect(PALETTE['r']).toBe('#ef4444');
  });

  it('should have correct purple color', () => {
    expect(PALETTE['p']).toBe('#a855f7');
  });

  it('should have correct white color', () => {
    expect(PALETTE['w']).toBe('#fff');
  });

  it('should have correct grey color', () => {
    expect(PALETTE['1']).toBe('#475569');
  });

  it('should have correct brown color', () => {
    expect(PALETTE['2']).toBe('#78350f');
  });

  it('should have correct green color', () => {
    expect(PALETTE['3']).toBe('#10b981');
  });

  it('should have correct black color', () => {
    expect(PALETTE['k']).toBe('#000');
  });

  it('should have correct crimson color', () => {
    expect(PALETTE['e']).toBe('#dc2626');
  });
});
