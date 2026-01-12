import { describe, it, expect } from 'vitest';
import { ItemGenerator } from '../../items/generator';
import { getRelicCooldownRefund, getRelicFireballMergeEffect, getRelicWeaponModifiers } from '../relicEffects';

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

  it('returns fireball merge effect for wizard relic', () => {
    const relic = ItemGenerator.generate({ itemType: 'relic', luck: 0, classId: 'wizard', random: () => 0.1 });
    const effect = getRelicFireballMergeEffect(relic, 'fireball');
    expect(effect?.projectileOverride).toBe(1);
    expect(effect?.mergeDamageMult).toBeCloseTo(0.4, 5);
    expect(effect?.mergeExplosionRadius).toBe(50);
    expect(effect?.mergeRadius).toBeCloseTo(10, 5);
    expect(effect?.baseExplosionRadius).toBe(40);
    expect(effect?.explosionDamageMult).toBe(1);
  });
});
