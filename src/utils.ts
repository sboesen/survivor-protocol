import { CONFIG } from './config';

export const Utils = {
  rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  },

  getDist(x1: number, y1: number, x2: number, y2: number): number {
    let dx = Math.abs(x2 - x1);
    let dy = Math.abs(y2 - y1);
    if (dx > CONFIG.worldSize / 2) dx = CONFIG.worldSize - dx;
    if (dy > CONFIG.worldSize / 2) dy = CONFIG.worldSize - dy;
    return Math.hypot(dx, dy);
  },

  fmtTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  }
};
