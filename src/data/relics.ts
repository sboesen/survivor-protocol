import type { WeaponType } from '../types';

export type RelicWeightTier = 'common' | 'uncommon' | 'rare' | 'chase';

export interface RelicEffectDefinition {
  id: string;
  name: string;
  description: string[];
  weaponId?: WeaponType;
  projectileBonus?: number;
  projectileOverride?: number;
  damageMult?: number;
  cooldownMult?: number;
  cooldownRefund?: number;
  fireballMergeDamageMult?: number;
  fireballMergeExplosionRadius?: number;
  fireballMergeRadius?: number;
  fireballExplosionBaseRadius?: number;
  fireballExplosionDamageMult?: number;
}

export interface RelicDefinition {
  id: string;
  name: string;
  classId: string;
  weightTier: RelicWeightTier;
  tint?: string;
  effect: RelicEffectDefinition;
}

export const RELIC_DEFINITIONS: RelicDefinition[] = [
  {
    id: 'sunforge_core',
    name: 'Sunforge Core',
    classId: 'wizard',
    weightTier: 'chase',
    tint: '#fb923c',
    effect: {
      id: 'wizard_sunforge_core',
      name: 'Sunforge Core',
      description: [
        'Fireball fuses into one core; extra projectiles increase its size.',
        'Each merged projectile grants +40% fireball damage and +50 explosion radius.',
        'Fireball explosions deal full damage.',
        'Fireball cooldown +50%.',
      ],
      weaponId: 'fireball',
      projectileOverride: 1,
      cooldownMult: 1.5,
      fireballMergeDamageMult: 0.4,
      fireballMergeExplosionRadius: 50,
      fireballMergeRadius: 10,
      fireballExplosionBaseRadius: 40,
      fireballExplosionDamageMult: 1,
    },
  },
  {
    id: 'storm_quiver',
    name: 'Storm Quiver',
    classId: 'ranger',
    weightTier: 'chase',
    tint: '#fbbf24',
    effect: {
      id: 'ranger_storm_quiver',
      name: 'Storm Quiver',
      description: [
        'Bow fires +2 projectiles.',
        'Each bow hit refunds 5% of bow cooldown.',
        'Bow damage -25%.',
      ],
      weaponId: 'bow',
      projectileBonus: 2,
      damageMult: 0.75,
      cooldownRefund: 0.05,
    },
  },
];

export const RELIC_WEIGHT_TIER_WEIGHTS: Record<RelicWeightTier, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  chase: 3,
};

const RELIC_POOL_BY_CLASS = RELIC_DEFINITIONS.reduce<Record<string, RelicDefinition[]>>((acc, relic) => {
  if (!acc[relic.classId]) acc[relic.classId] = [];
  acc[relic.classId].push(relic);
  return acc;
}, {});

function pickWeightedIndex(weights: number[], random: () => number): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const roll = random() * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (roll <= acc) return i;
  }
  return weights.length - 1;
}

export function getRelicsForClass(classId: string): RelicDefinition[] {
  return RELIC_POOL_BY_CLASS[classId] ?? [];
}

export function hasRelicsForClass(classId: string): boolean {
  return getRelicsForClass(classId).length > 0;
}

export function getRelicDefinitionById(id: string): RelicDefinition | undefined {
  return RELIC_DEFINITIONS.find(relic => relic.id === id);
}

export function rollWeightedRelic(
  pool: RelicDefinition[],
  random: () => number = Math.random,
  isBoss: boolean = false
): RelicDefinition {
  if (pool.length === 0) {
    throw new Error('Relic pool is empty.');
  }
  if (pool.length === 1) return pool[0];

  const weights = pool.map(relic => {
    let weight = RELIC_WEIGHT_TIER_WEIGHTS[relic.weightTier] ?? 1;
    if (isBoss && (relic.weightTier === 'rare' || relic.weightTier === 'chase')) {
      weight *= 2;
    }
    return weight;
  });

  return pool[pickWeightedIndex(weights, random)];
}
