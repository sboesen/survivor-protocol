import type { Weapon } from '../types';

export type LevelBonus = Partial<Weapon>;

/**
 * Maps internal weapon attributes to human-readable labels for the UI.
 * This is used for generating dynamic bonus descriptions.
 */
export const ATTRIBUTE_LABELS: Record<string, string> = {
    projectileCount: 'Projectile',
    pierce: 'Pierce',
    bounces: 'Bounce',
    explodeRadius: 'Explosion Radius',
    speedMult: 'Speed',
    splits: 'Splits on hit',
    trailDamage: 'Trail Damage',
    knockback: 'Knockback',
    size: 'Size',
    coneLength: 'Range',
    coneWidth: 'Width',
    spread: 'Width',
};

export const WEAPON_LEVELS: Record<string, Record<number, LevelBonus>> = {
    bubble_stream: {
        2: { projectileCount: 2 },
        3: { speedMult: 1.5 },
        4: { splits: true },
        5: { projectileCount: 3 },
    },
    frying_pan: {
        2: { explodeRadius: 40 },
        3: { knockback: 5 },
        4: { projectileCount: 2 },
        5: { size: 14 },
    },
    thrown_cds: {
        2: { projectileCount: 2 },
        3: { speedMult: 1.4 },
        4: { pierce: 1 },
        5: { projectileCount: 3 },
    },
    bow: {
        2: { projectileCount: 2 },
        3: { speedMult: 1.3 },
        4: { pierce: 1 },
        5: { projectileCount: 3, bounces: 1 },
    },
    fireball: {
        2: { explodeRadius: 50 },
        3: { speedMult: 1.3 },
        4: { trailDamage: 5 },
        5: { projectileCount: 2 },
    },
    lighter: {
        2: { coneLength: 150 },
        3: { spread: 1.8 },
        4: { coneLength: 200 },
        5: { speedMult: 2.0 },
    },
    shield_bash: {
        2: { coneLength: 80 },
        3: { coneWidth: 0.9 },
        4: { knockback: 12 },
        5: { coneLength: 100, knockback: 15 },
    },
};
