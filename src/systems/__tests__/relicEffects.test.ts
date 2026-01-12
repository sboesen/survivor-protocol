import { describe, it, expect } from 'vitest';
import { ItemGenerator } from '../../items/generator';
import { getRelicCooldownRefund, getRelicWeaponModifiers } from '../relicEffects';

describe('relicEffects', () => {
  it('returns modifiers for storm quiver', () => {
    const relic = ItemGenerator.generate({ itemType: 'relic', luck: 0, classId: 'ranger', random: () => 0.1 });
    const mods = getRelicWeaponModifiers(relic, 'bow');
    expect(mods.projectileBonus).toBe(2);
    expect(mods.damageMult).toBeCloseTo(0.75, 5);
    expect(mods.cooldownMult).toBe(1);
  });

  it('returns cooldown refund for bow hits', () => {
    const relic = ItemGenerator.generate({ itemType: 'relic', luck: 0, classId: 'ranger', random: () => 0.1 });
    const refund = getRelicCooldownRefund(relic, 'bow');
    expect(refund).toBeCloseTo(0.05, 5);
  });

  it('returns no modifiers for other weapons', () => {
    const relic = ItemGenerator.generate({ itemType: 'relic', luck: 0, classId: 'ranger', random: () => 0.1 });
    const mods = getRelicWeaponModifiers(relic, 'fireball');
    expect(mods.projectileBonus).toBe(0);
    expect(mods.damageMult).toBe(1);
  });
});
