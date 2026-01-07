export function applyArmorReduction(damage: number, armor: number): number {
  if (damage <= 0) return 0;
  if (armor <= 0) return Math.round(damage);

  const reduction = Math.min(armor * 0.05, 0.8);
  const reduced = damage * (1 - reduction);
  return Math.max(1, Math.round(reduced));
}

export function applyAreaBonus(base: number, areaFlat: number, areaPercent: number): number {
  if (base <= 0) return 0;
  return (base + areaFlat) * (1 + areaPercent);
}

export function applyDurationBonus(base: number, durationBonus: number): number {
  if (base <= 0) return 0;
  return Math.max(1, Math.round(base + durationBonus));
}

export function applyGoldBonus(base: number, goldBonus: number): number {
  if (base <= 0) return 0;
  if (goldBonus <= 0) return Math.round(base);
  return Math.max(0, Math.round(base * (1 + goldBonus)));
}

export function applyXpBonus(base: number, xpBonus: number): number {
  if (base <= 0) return 0;
  return base * (1 + xpBonus);
}

export function applyHealingBonus(base: number, healingBonus: number): number {
  if (base <= 0) return 0;
  return base * (1 + healingBonus);
}
