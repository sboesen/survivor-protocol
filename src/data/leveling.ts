import type { Weapon, WeaponType } from '../types';

export interface LevelBonus {
    apply?: (w: Weapon) => void;
}

export const WEAPON_LEVELS: Record<string, Record<number, LevelBonus>> = {
    bubble_stream: {
        2: { apply: (w) => { w.projectileCount = 2; } },
        3: { apply: (w) => { w.speedMult = 1.5; } },
        4: { apply: (w) => { w.splits = true; } },
        5: { apply: (w) => { w.projectileCount = 3; } },
    },
    frying_pan: {
        2: { apply: (w) => { w.explodeRadius = 40; } },
        3: { apply: (w) => { w.knockback = 5; } },
        4: { apply: (w) => { w.projectileCount = 2; } },
        5: { apply: (w) => { w.size = 14; } },
    },
    thrown_cds: {
        2: { apply: (w) => { w.projectileCount = 2; } },
        3: { apply: (w) => { w.speedMult = 1.4; } },
        4: { apply: (w) => { w.pierce = 1; } },
        5: { apply: (w) => { w.projectileCount = 3; } },
    },
    bow: {
        2: { apply: (w) => { w.projectileCount = 2; } },
        3: { apply: (w) => { w.speedMult = 1.3; } },
        4: { apply: (w) => { w.pierce = 1; } },
        5: { apply: (w) => { w.projectileCount = 3; w.bounces = 1; } },
    },
    fireball: {
        2: { apply: (w) => { w.explodeRadius = 50; } },
        3: { apply: (w) => { w.speedMult = 1.3; } },
        4: { apply: (w) => { w.trailDamage = 5; } },
        5: { apply: (w) => { w.projectileCount = 2; } },
    },
    lighter: {
        2: { apply: (w) => { w.coneLength = 150; } },
        3: { apply: (w) => { w.spread = 1.8; } },
        4: { apply: (w) => { w.coneLength = 200; } },
        5: { apply: (w) => { w.speedMult = 2.0; } },
    },
    shield_bash: {
        2: { apply: (w) => { w.coneLength = 80; } },
        3: { apply: (w) => { w.coneWidth = 0.9; } },
        4: { apply: (w) => { w.knockback = 12; } },
        5: { apply: (w) => { w.coneLength = 100; w.knockback = 15; } },
    },
};
