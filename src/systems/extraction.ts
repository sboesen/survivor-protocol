import { CONFIG } from '../config';
import { Utils } from '../utils';
import type { ExtractionZone, ExtractionState } from '../types';

export const ZONE_INTERVAL = 60 * 180;
export const ZONE_DURATION = 60 * 30;
export const EXTRACT_TIME = 60 * 5;
export const WARNING_TIME = 60 * 15;
export const ZONE_RADIUS = 120;
export const ENEMY_COUNT = 8;

export function initExtractionState(): ExtractionState {
  return {
    currentZone: null,
    lastSpawnTime: 0,
    nextSpawnTime: ZONE_INTERVAL,
    warningEndTime: 0,
    pendingZone: null,
  };
}

export function updateExtraction(
  state: ExtractionState,
  playerX: number,
  playerY: number,
  frames: number
): {
  state: ExtractionState;
  enemiesToSpawn: Array<{ x: number; y: number; type: 'basic' }> | null;
} {
  let enemiesToSpawn: Array<{ x: number; y: number; type: 'basic' }> | null = null;

  if (!state.currentZone && frames >= state.nextSpawnTime - WARNING_TIME && state.warningEndTime === 0) {
    state.warningEndTime = state.nextSpawnTime;
    state.pendingZone = createZonePosition(playerX, playerY);
  }

  if (!state.currentZone && frames >= state.nextSpawnTime) {
    const position = state.pendingZone ?? createZonePosition(playerX, playerY);
    state.currentZone = createExtractionZone(position.x, position.y, frames);
    state.lastSpawnTime = frames;
    state.nextSpawnTime = frames + ZONE_INTERVAL;
    state.warningEndTime = 0;
    state.pendingZone = null;
  }

  if (state.currentZone) {
    const zone = state.currentZone;

    if (frames >= zone.expiresAt) {
      zone.active = false;
      state.currentZone = null;
      return { state, enemiesToSpawn: null };
    }

    const dist = Utils.getDist(playerX, playerY, zone.x, zone.y);
    zone.inZone = dist <= zone.radius;

    if (zone.inZone) {
      zone.extractionProgress += 1;
      if (!zone.enemiesSpawned) {
        enemiesToSpawn = spawnEnemiesInCircle(zone.x, zone.y);
        zone.enemiesSpawned = true;
      }
    } else {
      zone.extractionProgress = 0;
    }
  }

  return { state, enemiesToSpawn };
}

export function shouldExtract(state: ExtractionState): boolean {
  return !!(state.currentZone && state.currentZone.extractionProgress >= EXTRACT_TIME);
}

function createExtractionZone(x: number, y: number, frames: number): ExtractionZone {
  return {
    x,
    y,
    radius: ZONE_RADIUS,
    spawnTime: frames,
    expiresAt: frames + ZONE_DURATION,
    active: true,
    extractionProgress: 0,
    inZone: false,
    enemiesSpawned: false,
  };
}

function createZonePosition(playerX: number, playerY: number): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const dist = 400 + Math.random() * 400;
  return {
    x: (playerX + Math.cos(angle) * dist + CONFIG.worldSize) % CONFIG.worldSize,
    y: (playerY + Math.sin(angle) * dist + CONFIG.worldSize) % CONFIG.worldSize,
  };
}

function spawnEnemiesInCircle(zoneX: number, zoneY: number): Array<{ x: number; y: number; type: 'basic' }> {
  const enemies: Array<{ x: number; y: number; type: 'basic' }> = [];
  const circleRadius = 150;

  for (let i = 0; i < ENEMY_COUNT; i++) {
    const angle = (i / ENEMY_COUNT) * Math.PI * 2;
    enemies.push({
      x: (zoneX + Math.cos(angle) * circleRadius + CONFIG.worldSize) % CONFIG.worldSize,
      y: (zoneY + Math.sin(angle) * circleRadius + CONFIG.worldSize) % CONFIG.worldSize,
      type: 'basic',
    });
  }

  return enemies;
}
