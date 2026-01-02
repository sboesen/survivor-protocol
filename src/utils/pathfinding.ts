import { CONFIG } from '../config';
import { Obstacle } from '../entities/obstacle';

// Grid-based A* pathfinding for enemies
const CELL_SIZE = 50;
const GRID_WIDTH = Math.ceil(CONFIG.worldSize / CELL_SIZE);
const GRID_HEIGHT = Math.ceil(CONFIG.worldSize / CELL_SIZE);

interface Point {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to end
  f: number; // Total cost
  parent: Point | null;
}

let obstacleGrid: boolean[][] | null = null;
let gridFrame = 0;

// Rebuild obstacle grid (not every frame)
export function updateObstacleGrid(obstacles: Obstacle[], frame: number): void {
  // Update every 60 frames or if grid doesn't exist
  if (obstacleGrid && frame - gridFrame < 60) return;
  gridFrame = frame;

  obstacleGrid = [];
  for (let x = 0; x < GRID_WIDTH; x++) {
    obstacleGrid[x] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const worldX = x * CELL_SIZE + CELL_SIZE / 2;
      const worldY = y * CELL_SIZE + CELL_SIZE / 2;

      // Check if this cell collides with any obstacle
      let blocked = false;
      for (const o of obstacles) {
        if (o.type === 'font') continue;
        const dist = Math.hypot(worldX - o.x, worldY - o.y);
        if (dist < 80) {
          if (worldX > o.x - o.w / 2 - 20 && worldX < o.x + o.w / 2 + 20 &&
              worldY > o.y - o.h / 2 - 20 && worldY < o.y + o.h / 2 + 20) {
            blocked = true;
            break;
          }
        }
      }
      obstacleGrid[x][y] = blocked;
    }
  }
}

// Get next movement direction using A* pathfinding
export function getPathDirection(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  speed: number
): { dx: number; dy: number } | null {
  if (!obstacleGrid) return null;

  const fromCellX = Math.floor(fromX / CELL_SIZE);
  const fromCellY = Math.floor(fromY / CELL_SIZE);
  const toCellX = Math.floor(toX / CELL_SIZE);
  const toCellY = Math.floor(toY / CELL_SIZE);

  // Clamp to grid bounds
  const clampedFromX = Math.max(0, Math.min(GRID_WIDTH - 1, fromCellX));
  const clampedFromY = Math.max(0, Math.min(GRID_HEIGHT - 1, fromCellY));
  const clampedToX = Math.max(0, Math.min(GRID_WIDTH - 1, toCellX));
  const clampedToY = Math.max(0, Math.min(GRID_HEIGHT - 1, toCellY));

  // Direct path if no obstacles nearby
  if (!isBlocked(clampedToX, clampedToY)) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    // Handle wrapping
    let wrapDx = dx, wrapDy = dy;
    if (dx > CONFIG.worldSize / 2) wrapDx -= CONFIG.worldSize;
    if (dx < -CONFIG.worldSize / 2) wrapDx += CONFIG.worldSize;
    if (dy > CONFIG.worldSize / 2) wrapDy -= CONFIG.worldSize;
    if (dy < -CONFIG.worldSize / 2) wrapDy += CONFIG.worldSize;

    // Check if direct path is clear using raycast
    if (isPathClear(fromX, fromY, toX, toY)) {
      const dist = Math.hypot(wrapDx, wrapDy);
      if (dist > 0) {
        return { dx: (wrapDx / dist) * speed, dy: (wrapDy / dist) * speed };
      }
    }
  }

  // A* pathfinding
  const path = findPath(clampedFromX, clampedFromY, clampedToX, clampedToY, fromX, fromY, toX, toY);
  if (!path || path.length === 0) return null;

  // Get direction to first cell on path
  const targetWorldX = path[0].x * CELL_SIZE + CELL_SIZE / 2;
  const targetWorldY = path[0].y * CELL_SIZE + CELL_SIZE / 2;

  let dx = targetWorldX - fromX;
  let dy = targetWorldY - fromY;

  // Handle wrapping for direction
  if (dx > CONFIG.worldSize / 2) dx -= CONFIG.worldSize;
  if (dx < -CONFIG.worldSize / 2) dx += CONFIG.worldSize;
  if (dy > CONFIG.worldSize / 2) dy -= CONFIG.worldSize;
  if (dy < -CONFIG.worldSize / 2) dy += CONFIG.worldSize;

  const dist = Math.hypot(dx, dy);
  if (dist > 0) {
    return { dx: (dx / dist) * speed, dy: (dy / dist) * speed };
  }

  return null;
}

function isBlocked(x: number, y: number): boolean {
  if (!obstacleGrid) return false;
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
  return obstacleGrid[x][y];
}

// Simple raycast to check if path is clear
function isPathClear(x1: number, y1: number, x2: number, y2: number): boolean {
  if (!obstacleGrid) return true;

  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(dist / (CELL_SIZE / 2));

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const checkX = x1 + (x2 - x1) * t;
    const checkY = y1 + (y2 - y1) * t;
    const cellX = Math.floor(checkX / CELL_SIZE);
    const cellY = Math.floor(checkY / CELL_SIZE);

    if (cellX >= 0 && cellX < GRID_WIDTH && cellY >= 0 && cellY < GRID_HEIGHT) {
      if (obstacleGrid[cellX][cellY]) return false;
    }
  }

  return true;
}

// A* algorithm
function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  worldStartX: number,
  worldStartY: number,
  worldEndX: number,
  worldEndY: number
): { x: number; y: number }[] | null {
  if (!obstacleGrid) return null;

  const openSet: Point[] = [];
  const closedSet = new Set<string>();

  const start: Point = {
    x: startX,
    y: startY,
    g: 0,
    h: 0,
    f: 0,
    parent: null
  };

  // Heuristic using world position (accounting for wrapping)
  const hX = worldEndX - worldStartX;
  const hY = worldEndY - worldStartY;
  if (hX > CONFIG.worldSize / 2) start.h = (hX - CONFIG.worldSize) ** 2;
  else if (hX < -CONFIG.worldSize / 2) start.h = (hX + CONFIG.worldSize) ** 2;
  else start.h = hX ** 2;
  if (hY > CONFIG.worldSize / 2) start.h += (hY - CONFIG.worldSize) ** 2;
  else if (hY < -CONFIG.worldSize / 2) start.h += (hY + CONFIG.worldSize) ** 2;
  else start.h += hY ** 2;
  start.f = start.g + start.h;

  openSet.push(start);

  const maxIterations = 300; // Limit pathfinding computation
  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Get node with lowest f
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    const currentKey = `${current.x},${current.y}`;
    closedSet.add(currentKey);

    // Reached goal?
    if (current.x === endX && current.y === endY) {
      // Reconstruct path
      const path: { x: number; y: number }[] = [];
      let node: Point | null = current;
      while (node && node.parent) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      // For adjacent cells, path contains [goal]; slice(1) would give empty array
      // Return path as-is (first cell is neighbor of start, or goal itself if adjacent)
      return path.length > 0 ? path : null;
    }

    // Check neighbors (8 directions)
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
      { x: current.x + 1, y: current.y + 1 },
      { x: current.x - 1, y: current.y - 1 },
      { x: current.x + 1, y: current.y - 1 },
      { x: current.x - 1, y: current.y + 1 },
    ];

    for (const neighbor of neighbors) {
      // Skip if out of bounds
      if (neighbor.x < 0 || neighbor.x >= GRID_WIDTH || neighbor.y < 0 || neighbor.y >= GRID_HEIGHT) continue;

      // Skip if blocked
      if (obstacleGrid[neighbor.x][neighbor.y]) continue;

      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(neighborKey)) continue;

      // Calculate g cost (diagonal = 1.414, straight = 1)
      const dist = (neighbor.x !== current.x && neighbor.y !== current.y) ? 1.414 : 1;
      const tentativeG = current.g + dist;

      // Check if neighbor is already in open set with lower g
      const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
      if (existingNode && tentativeG >= existingNode.g) continue;

      // Heuristic to goal
      let h = 0;
      const dx = endX - neighbor.x;
      const dy = endY - neighbor.y;
      h = dx * dx + dy * dy;

      const newNode: Point = {
        x: neighbor.x,
        y: neighbor.y,
        g: tentativeG,
        h,
        f: tentativeG + h,
        parent: current
      };

      if (existingNode) {
        Object.assign(existingNode, newNode);
      } else {
        openSet.push(newNode);
      }
    }
  }

  // No path found - return best partial path toward goal
  openSet.sort((a, b) => a.h - b.h);
  if (openSet.length > 0) {
    const best = openSet[0];
    if (best.parent) {
      const path: { x: number; y: number }[] = [];
      let node: Point | null = best;
      while (node && node.parent) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path.length > 0 ? path : null;
    }
  }

  return null;
}
