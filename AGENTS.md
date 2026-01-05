# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Survivor Protocol is a vampire survivor-style browser game built with TypeScript and Vite. Players control a character, fight waves of enemies, collect loot, level up, and unlock permanent upgrades.

### Core Game Loop: Risk Your Loot to Get Better Loot

**During runs**: Survive escalating hordes while collecting "veiled" unidentified loot. Level up your weapons, unlock abilities, become godlike by minute 20.

**Extraction**: Race to escape zones when they appear. Die and lose everything (except one secured item). Extract and keep your haul.

**Between runs**: Reveal your loot (slot-machine moment!), equip items to 7 slots, build permanent power. Hunt class-specific relics with min-max rolls.

### What Makes It Fun
1. **In-run power growth** - Weapons level up, new abilities unlock, screen fills with projectiles
2. **Loot chase** - Veiled items create extraction tension; reveals are exciting
3. **Buildcrafting** - 7 equipment slots, 30 class-specific relics, synergistic loadouts
4. **Risk/reward** - Push deeper for better loot vs. extract early to secure gains
5. **Endgame grind** - Farm bosses for relics, hunt god rolls, tackle modifier maps

## Development Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production (runs TypeScript compiler, then Vite build)
- `npm run lint` - Run ESLint on TypeScript files in `src/`

## Important: Never Kill or Start Dev Server

**CRITICAL RULE**: Never use `pkill`, `kill`, or any process termination commands on the dev server. The dev server has hot module replacement (HMR) - most changes auto-refresh without restart. If you need to restart, ask the user to do it manually.

**NEVER START THE DEV SERVER** unless the user explicitly asks you to. The user likely already has it running. Starting it unnecessarily wastes resources and creates confusion.

This prevents frustrating the user by unexpectedly stopping or interfering with their development workflow.

## Architecture

### Entry Point
- `src/main.ts` - Bootstraps the game, exposes classes to window for HTML onclick handlers, calls `Game.init()`

### Core Game Loop
- `src/game.ts` - The `GameCore` singleton manages the entire game:
  - Canvas setup and resizing
  - Input handling (keyboard + virtual joystick for touch)
  - Main `update()` loop: player movement, enemy spawning, weapon firing, collision detection
  - Main `render()` loop: draws grid, obstacles, loot, enemies, projectiles, player
  - Game state: `start()`, `gameOver()`, `triggerLevelUp()`, `triggerUlt()`

### World System
- World wraps at boundaries (toroidal topology)
- `Utils.getDist()` handles wrapped distance calculations correctly
- `Entity.draw()` handles wrapped rendering (entities appear on both sides when crossing edges)
- `CONFIG.worldSize` = 2000px

### Entity System
- `src/entities/entity.ts` - Base `Entity` class with position, radius, and `draw()` method handling world wrapping and culling
- Subclasses implement `drawShape()` for custom rendering via `Renderer.drawSprite()`
- Entities have a `marked` flag for deletion

### Character System
- `src/data/characters.ts` - Defines 8 characters (Janitor, Skater, Mall Cop, Chef, Teenager, Tech Support, Ninja, Dungeon Master)
- Each has: `hpMod`, `spdMod`, starting `weapon`, and `ult`
- `src/entities/player.ts` - Player class with weapons, passives, XP, leveling, ult charge

### Weapons
- Defined in `src/types/index.ts` as `Weapon` interface
- 8 types with different firing behaviors:
  - `nearest` - Auto-targets closest enemy (Pepper Spray/Wand)
  - `facing` - Shoots in last moved direction (Thrown CDs/Knife)
  - `aura` - Area damage around player (Mop Bucket/Orbit)
  - `arc` - Parabolic arc projectile (Frying Pan/Axe)
  - `melee` - Cone attack with distance falloff (Rake Claw)
  - `chain` - Bounces between enemies (Server Zap)
  - `flicker` - Teleport strike (Flicker Strike)
  - `fireball` - Homing projectile with particle trail (Grease Fire)
- Weapons level up: damage ×1.3, cooldown ×0.9 per level
- **IMPORTANT**: When adding new projectile weapons, use `1 + p.passives.pierce` (or similar) for pierce value so "Sharp Edges" upgrade works

### Upgrades
- `src/data/upgrades.ts` - Weapons and passives offered during level-up
- Level-up shows 3 random choices from `UPGRADES`
- `Player.addUpgrade()` handles both new weapons and upgrades

### Enemy Types
- `basic` - Standard chaser
- `bat` - Faster but weaker
- `elite` - Spawns every 60 seconds, drops chest
- `boss` - Spawns every 5 minutes, only one at a time

### Save System
- `src/systems/saveData.ts` - `SaveData` singleton persists to localStorage
- Key: `survivor_protocol_v2`
- Stores: gold, owned characters, selected character, shop upgrades (damage, health, speed, magnet)
- Uses `??` nullish coalescing for safe merging when loading saved data

### Rendering
- `src/systems/renderer.ts` - `Renderer.drawSprite()` draws pixel art from sprite maps
- `src/assets/sprites.ts` - 10x10 character grids using palette keys
- `src/assets/palette.ts` - Color mappings for palette keys

### UI Systems
- `src/systems/ui.ts` - HUD updates, damage text, level-up screen, game-over screen
- `src/systems/menu.ts` - Character select gacha, shop
- `src/systems/gacha.ts` - Gacha pull animation for unlocking characters

## Path Aliases
- `@/*` maps to `src/*` (configured in `tsconfig.json`)
- Not actively used; imports use relative paths like `../config`

## TypeScript Configuration
- Strict mode enabled
- `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` enabled
- Target: ES2020, Module: ESNext
