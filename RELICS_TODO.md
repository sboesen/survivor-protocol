# Relic TODO (Post-MVP)

This file tracks the planned class-specific relics and the remaining implementation work.
The MVP currently implements a Ranger relic (Storm Quiver) and a Wizard relic (Sunforge Core) as examples.

## Current State
- Relic data lives in `src/data/relics.ts`.
- Effects are resolved via `src/systems/relicEffects.ts` and applied in `src/game.ts`.
- Relics roll normal affixes; unique effects are separate text + logic.

## Planned Relics (25 total, 5 per class)

### Wizard
- Arcane Die (chase): 5% chance for 10x damage.
- Sunforge Core (chase): fireball fuses into one core; merged projectiles boost size/explosion; cooldown +50%. (Implemented)
- Grimoire of Chains (common): fireballs chain to 3.
- Warding Screen (rare): +100% luck, -20% damage.
- Critical Convergence (uncommon): crits double projectile count for 5s.

### Paladin
- Last Stand Aegis (chase): lethal hit triggers 3s invuln + holy nova + heal to 30%; max HP -20%; once per run.
- Consecrated Banner (common): aura leaves slowing trail.
- Paladin's Ring (common): aura hits heal 1-2 HP.
- Sanctified Flail (rare): smite bolts split on hit.
- Aegis Oath (uncommon): 5 kills in 3s -> shield for 10s.

### Rogue
- Shadow Chakram (chase): blades bounce +2 and +1 pierce.
- Nightstep Boots (common): +30% speed, knockback pass-through.
- Venom Vial (common): blades leave poison trail.
- Cloak of Knives (uncommon): pulse damage every 1s.
- Second Shadow (rare): ult triggers twice.

### Knight
- Royal Crest (chase): every 20s next hit is negated and retaliates in a wide cone for 300% damage; attack cooldown +15%.
- Chain Smite (rare): primary attack chains to 2.
- Squire's Banner (uncommon): decoy every 60s.
- Battle Rations (common): kill streak heals.
- Knight's Rest (common): standing still regenerates HP.

### Pyromancer
- Forbidden Formula (chase): 3 food items -> random 60s buff.
- Inferno Core (rare): fire kills explode.
- Pyromancer's Hood (uncommon): ult +50% area, leaves fire trail.
- Cinder Brand (common): attacks apply burn.
- Ember Feast (common): +100% gold, food heals 2x.

### Ranger
- Storm Quiver (chase): bow fires +2 projectiles; each bow hit refunds 5% of bow cooldown; bow damage -25%. (Implemented)
- Splinter Barrage (chase): bow projectiles split into 2 shards on hit; bow cooldown +25%.
- Rapid Draw (rare): bow cooldown -35%, bow damage -25%.
- Ricochet Harness (uncommon): arrows bounce once; projectile speed -20%.
- Splitshot Locket (common): bow fires +1 projectile, +20% spread; bow cooldown +15%.

## Implementation TODO
- Add remaining relic definitions to `src/data/relics.ts`.
- Implement effect logic per relic in `src/systems/relicEffects.ts` and `src/game.ts`.
- Add tests per relic for effect behavior and gating.
- Tune relic drop rates and debug loot boost multipliers.
- Update tooltips if new effect types need special formatting.
