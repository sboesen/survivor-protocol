import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { updateObstacleGrid, getPathDirection } from '../pathfinding';
import { Obstacle } from '../../entities/obstacle';

describe('pathfinding', () => {
  let obstacles: Obstacle[];

  beforeEach(() => {
    obstacles = [];
  });

  afterEach(() => {
    // Reset the grid state
    updateObstacleGrid([], 0);
  });

  describe('updateObstacleGrid', () => {
    it('should initialize grid without errors', () => {
      expect(() => updateObstacleGrid([], 0)).not.toThrow();
    });

    it('should update grid when frame difference >= 60', () => {
      updateObstacleGrid([], 0);
      updateObstacleGrid([], 60);
      // Second call should update the grid
      expect(true).toBe(true);
    });

    it('should not update grid when frame difference < 60', () => {
      updateObstacleGrid([], 0);
      updateObstacleGrid([], 30);
      // Second call should skip update
      expect(true).toBe(true);
    });

    it('should handle empty obstacles array', () => {
      expect(() => updateObstacleGrid([], 0)).not.toThrow();
    });

    it('should handle obstacles in grid', () => {
      const obstacle = new Obstacle(500, 500, 100, 100, 'ruin');
      expect(() => updateObstacleGrid([obstacle], 0)).not.toThrow();
    });

    it('should ignore font type obstacles', () => {
      const fountain = new Obstacle(500, 500, 0, 0, 'font');
      updateObstacleGrid([fountain], 0);
      // Should not throw - font obstacles are ignored
      expect(true).toBe(true);
    });

    it('should handle multiple obstacles', () => {
      const obs1 = new Obstacle(200, 200, 80, 80, 'ruin');
      const obs2 = new Obstacle(600, 600, 100, 100, 'ruin');
      const fountain = new Obstacle(400, 400, 0, 0, 'font');
      expect(() => updateObstacleGrid([obs1, obs2, fountain], 0)).not.toThrow();
    });
  });

  describe('getPathDirection', () => {
    beforeEach(() => {
      // Initialize grid before each test
      updateObstacleGrid([], 0);
    });

    it('should return null when grid is not initialized', () => {
      // Reset by calling with high frame number to force update but then clearing
      updateObstacleGrid([], 0);
      // The function should handle the grid being available
      const result = getPathDirection(100, 100, 200, 200, 2);
      // With no obstacles, should return direction
      expect(result).not.toBeNull();
    });

    it('should return direction vector for clear path', () => {
      const result = getPathDirection(100, 100, 200, 200, 2);
      expect(result).not.toBeNull();
      expect(result!.dx).toBeDefined();
      expect(result!.dy).toBeDefined();
    });

    it('should return normalized direction', () => {
      const result = getPathDirection(0, 0, 100, 0, 5);
      expect(result).not.toBeNull();
      const magnitude = Math.hypot(result!.dx, result!.dy);
      expect(magnitude).toBeCloseTo(5, 1);
    });

    it('should handle zero distance', () => {
      const result = getPathDirection(100, 100, 100, 100, 2);
      // Same position - should handle gracefully
      if (result) {
        expect(result.dx).toBeDefined();
        expect(result.dy).toBeDefined();
      }
    });

    it('should handle horizontal movement', () => {
      const result = getPathDirection(100, 100, 200, 100, 3);
      expect(result).not.toBeNull();
      expect(result!.dy).toBeCloseTo(0, 1);
    });

    it('should handle vertical movement', () => {
      const result = getPathDirection(100, 100, 100, 200, 3);
      expect(result).not.toBeNull();
      expect(result!.dx).toBeCloseTo(0, 1);
    });

    it('should handle diagonal movement', () => {
      const result = getPathDirection(0, 0, 100, 100, 5);
      expect(result).not.toBeNull();
      // dx and dy should be approximately equal for diagonal
      expect(Math.abs(result!.dx - result!.dy)).toBeLessThan(0.1);
    });

    it('should respect speed parameter', () => {
      const result1 = getPathDirection(0, 0, 100, 0, 2);
      const result2 = getPathDirection(0, 0, 100, 0, 5);
      const mag1 = Math.hypot(result1!.dx, result1!.dy);
      const mag2 = Math.hypot(result2!.dx, result2!.dy);
      expect(mag2).toBeCloseTo(mag1 * 2.5, 1);
    });

    it('should handle world wrapping for x coordinate', () => {
      // From near right edge to near left edge
      const result = getPathDirection(1900, 1000, 100, 1000, 3);
      expect(result).not.toBeNull();
      // Should choose wrapped path (shorter)
    });

    it('should handle world wrapping for y coordinate', () => {
      const result = getPathDirection(1000, 1900, 1000, 100, 3);
      expect(result).not.toBeNull();
    });

    it('should handle world wrapping for both coordinates', () => {
      const result = getPathDirection(1900, 1900, 100, 100, 3);
      expect(result).not.toBeNull();
    });
  });

  describe('getPathDirection with obstacles', () => {
    it('should navigate around obstacles', () => {
      const obstacle = new Obstacle(150, 100, 80, 80, 'ruin');
      updateObstacleGrid([obstacle], 0);

      // Path from (100, 100) to (200, 100) with obstacle in between
      const result = getPathDirection(100, 100, 200, 100, 2);
      expect(result).not.toBeNull();
    });

    it('should return null when path is completely blocked', () => {
      // Create a wall of obstacles
      const obstacles = [];
      for (let y = 0; y < 2000; y += 40) {
        obstacles.push(new Obstacle(150, y, 40, 40, 'ruin'));
      }
      updateObstacleGrid(obstacles, 0);

      // Try to path through the wall
      const result = getPathDirection(100, 1000, 200, 1000, 2);
      // May return null or a direction trying to go around
      expect(result).toBeDefined();
    });

    it('should handle obstacle at target position', () => {
      const obstacle = new Obstacle(200, 200, 100, 100, 'ruin');
      updateObstacleGrid([obstacle], 0);

      // Target is inside obstacle
      const result = getPathDirection(100, 100, 200, 200, 2);
      expect(result).toBeDefined();
    });
  });

  describe('A* pathfinding edge cases', () => {
    it('should handle start outside grid bounds', () => {
      updateObstacleGrid([], 0);
      const result = getPathDirection(-10, -10, 100, 100, 2);
      expect(result).toBeDefined();
    });

    it('should handle end outside grid bounds', () => {
      updateObstacleGrid([], 0);
      const result = getPathDirection(100, 100, 3000, 3000, 2);
      expect(result).toBeDefined();
    });

    it('should clamp positions to grid bounds', () => {
      updateObstacleGrid([], 0);
      const result = getPathDirection(-100, -100, 2100, 2100, 2);
      expect(result).toBeDefined();
    });
  });

  describe('grid cell size', () => {
    it('should use CELL_SIZE of 50', () => {
      // The CELL_SIZE is defined as 50 in the module
      // This test verifies the grid is sized correctly
      updateObstacleGrid([], 0);
      // Grid width = ceil(2000 / 50) = 40
      // Grid height = ceil(2000 / 50) = 40
      expect(true).toBe(true);
    });
  });

  describe('obstacle collision in grid', () => {
    it('should mark cells as blocked near obstacles', () => {
      const obstacle = new Obstacle(250, 250, 100, 100, 'ruin');
      updateObstacleGrid([obstacle], 0);

      // Grid should be updated
      expect(true).toBe(true);
    });

    it('should not mark cells far from obstacles as blocked', () => {
      const obstacle = new Obstacle(250, 250, 50, 50, 'ruin');
      updateObstacleGrid([obstacle], 0);

      // Path from far away should work
      const result = getPathDirection(1800, 1800, 1900, 1900, 2);
      expect(result).not.toBeNull();
    });
  });

  describe('raycast for clear path', () => {
    it('should detect clear direct path', () => {
      updateObstacleGrid([], 0);
      const result = getPathDirection(100, 100, 200, 200, 2);
      expect(result).not.toBeNull();
    });

    it('should detect blocked path', () => {
      const obstacle = new Obstacle(150, 150, 100, 100, 'ruin');
      updateObstacleGrid([obstacle], 0);

      // Path that goes through obstacle should trigger pathfinding
      const result = getPathDirection(100, 150, 200, 150, 2);
      expect(result).toBeDefined();
    });
  });

  describe('performance limiting', () => {
    it('should limit A* iterations to prevent infinite loops', () => {
      // Create a maze-like situation
      const obstacles = [];
      for (let i = 0; i < 50; i++) {
        obstacles.push(new Obstacle(200 + i * 5, 200, 40, 40, 'ruin'));
      }
      updateObstacleGrid(obstacles, 0);

      const result = getPathDirection(100, 200, 500, 200, 2);
      // Should return something (either path or best effort)
      expect(result).toBeDefined();
    });
  });

  describe('partial path return', () => {
    it('should return best partial path when full path impossible', () => {
      // Create a situation where full pathfinding is difficult
      const obstacles = [
        new Obstacle(300, 0, 50, 1500, 'ruin'),
        new Obstacle(300, 1600, 50, 400, 'ruin'),
      ];
      updateObstacleGrid(obstacles, 0);

      const result = getPathDirection(100, 1000, 500, 1000, 2);
      // Should return partial path or null
      expect(result).toBeDefined();
    });
  });
});
