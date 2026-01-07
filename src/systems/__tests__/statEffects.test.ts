import { describe, it, expect } from 'vitest';
import {
  applyAreaBonus,
  applyArmorReduction,
  applyDurationBonus,
  applyGoldBonus,
  applyHealingBonus,
  applyXpBonus,
} from '../statEffects';

describe('statEffects', () => {
  it('applies area bonuses as flat + percent', () => {
    expect(applyAreaBonus(40, 10, 0.5)).toBe(75);
  });

  it('applies duration bonuses as flat frames', () => {
    expect(applyDurationBonus(60, 12)).toBe(72);
  });

  it('reduces incoming damage with armor', () => {
    expect(applyArmorReduction(10, 2)).toBe(9);
    expect(applyArmorReduction(10, 0)).toBe(10);
  });

  it('applies gold bonus with rounding', () => {
    expect(applyGoldBonus(100, 0.2)).toBe(120);
  });

  it('applies xp bonus without rounding', () => {
    expect(applyXpBonus(10, 0.25)).toBe(12.5);
  });

  it('applies healing bonus as a multiplier', () => {
    expect(applyHealingBonus(30, 0.5)).toBe(45);
  });
});
