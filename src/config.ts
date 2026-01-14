import type { Config } from './types';

export const CONFIG: Config = {
  worldSize: 2000,
  viewDist: 1000,
  weaponTargetRange: 400,
  healthRegenInterval: 60,
  playerDamageInterval: 30,
  colors: {
    player: '#6b7280',
    enemy: '#6d8c4f',
    obstacle: '#4a5568',
    gem: '#fbbf24'
  }
};
