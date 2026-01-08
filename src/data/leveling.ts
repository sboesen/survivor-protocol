import type { Weapon, WeaponType } from '../types';

export interface LevelBonus {
    desc: string;
    apply?: (w: Weapon) => void;
}

export const WEAPON_LEVELS: Record<string, Record<number, LevelBonus>> = {
    bubble_stream: {
        2: { desc: '+1 Projectile', apply: (w) => { w.projectileCount = 2; } },
        3: { desc: '+50% Speed', apply: (w) => { w.speedMult = 1.5; } },
        4: { desc: 'Splits on hit', apply: (w) => { w.splits = true; } },
        5: { desc: '+1 Projectile', apply: (w) => { w.projectileCount = 3; } },
    },
    frying_pan: {
        2: { desc: 'Explosion', apply: (w) => { w.explodeRadius = 40; } },
        3: { desc: '+Knockback', apply: (w) => { w.knockback = 5; } },
        4: { desc: '+1 Projectile', apply: (w) => { w.projectileCount = 2; } },
        5: { desc: '+Size', apply: (w) => { w.size = 14; } },
    },
    thrown_cds: {
        2: { desc: '+1 CD', apply: (w) => { w.projectileCount = 2; } },
        3: { desc: '+40% Speed', apply: (w) => { w.speedMult = 1.4; } },
        4: { desc: '+1 Pierce' }, // Visual only as handled by passive
        5: { desc: '+1 CD', apply: (w) => { w.projectileCount = 3; } },
    },
    bow: {
        2: { desc: '+1 Arrow', apply: (w) => { w.projectileCount = 2; } },
        3: { desc: '+30% Speed', apply: (w) => { w.speedMult = 1.3; } },
        4: { desc: '+1 Pierce' },
        5: { desc: '+1 Arrow\n+Ricochet', apply: (w) => { w.projectileCount = 3; w.bounces = 1; } },
    },
    fireball: {
        2: { desc: '+Explosion Radius', apply: (w) => { w.explodeRadius = 50; } },
        3: { desc: '+30% Speed', apply: (w) => { w.speedMult = 1.3; } },
        4: { desc: 'Trail deals damage', apply: (w) => { w.trailDamage = 5; } },
        5: { desc: '+1 Fireball', apply: (w) => { w.projectileCount = 2; } },
    },
    lighter: {
        2: { desc: '+Range', apply: (w) => { w.coneLength = 150; } },
        3: { desc: '+Width', apply: (w) => { w.spread = 1.8; } },
        4: { desc: '+Max Range', apply: (w) => { w.coneLength = 200; } },
        5: { desc: '+100% Speed', apply: (w) => { w.speedMult = 2.0; } },
    },
    shield_bash: {
        2: { desc: '+Range', apply: (w) => { w.coneLength = 80; } },
        3: { desc: 'Wider Cone', apply: (w) => { w.coneWidth = 0.9; } },
        4: { desc: '++Knockback', apply: (w) => { w.knockback = 12; } },
        5: { desc: '+Dmg & Knockback', apply: (w) => { w.coneLength = 100; w.knockback = 15; } },
    },
};
