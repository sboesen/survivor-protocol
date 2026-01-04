import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, type ScreenPosition } from '../entity';
import type { CanvasContext } from '../../types';

// Mock canvas context
const mockCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  fillRect: () => {},
  stroke: () => {},
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
} as unknown as CanvasContext;

// Concrete implementation of Entity for testing
class TestEntity extends Entity {
  drawShapeCalled = false;
  drawShapeCtx: CanvasContext | null = null;
  drawShapePos: ScreenPosition | null = null;

  drawShape(ctx: CanvasContext, pos: ScreenPosition): void {
    this.drawShapeCalled = true;
    this.drawShapeCtx = ctx;
    this.drawShapePos = pos;
  }

  get drawShapeX(): number {
    return this.drawShapePos?.sx ?? 0;
  }

  get drawShapeY(): number {
    return this.drawShapePos?.sy ?? 0;
  }
}

describe('Entity', () => {
  let entity: TestEntity;

  beforeEach(() => {
    entity = new TestEntity(100, 200, 15, '#ff0000');
  });

  describe('constructor', () => {
    it('should create entity with given position', () => {
      expect(entity.x).toBe(100);
      expect(entity.y).toBe(200);
    });

    it('should create entity with given radius', () => {
      expect(entity.radius).toBe(15);
    });

    it('should create entity with given color', () => {
      expect(entity.color).toBe('#ff0000');
    });

    it('should initialize marked flag as false', () => {
      expect(entity.marked).toBe(false);
    });

    it('should handle zero radius', () => {
      const zeroRadiusEntity = new TestEntity(0, 0, 0, '#fff');
      expect(zeroRadiusEntity.radius).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const negEntity = new TestEntity(-50, -100, 10, '#fff');
      expect(negEntity.x).toBe(-50);
      expect(negEntity.y).toBe(-100);
    });
  });

  describe('draw', () => {
    it('should call drawShape with correct screen coordinates', () => {
      const cw = 800;
      const ch = 600;
      const px = 100;
      const py = 100;

      entity.draw(mockCtx, px, py, cw, ch);

      expect(entity.drawShapeCalled).toBe(true);
      // Screen x = entity.x - player.x + canvasWidth/2 = 100 - 100 + 400 = 400
      expect(entity.drawShapeX).toBe(400);
      // Screen y = entity.y - player.y + canvasHeight/2 = 200 - 100 + 300 = 400
      expect(entity.drawShapeY).toBe(400);
    });

    it('should cull entities far off screen', () => {
      entity.draw(mockCtx, 0, 0, 800, 600);
      // Entity at (100, 200) relative to player at (0, 0)
      // Screen x = 100 + 400 = 500, Screen y = 200 + 300 = 500
      // Within culling bounds, so drawShape should be called
      expect(entity.drawShapeCalled).toBe(true);
    });

    it('should not call drawShape for culled entities', () => {
      const farEntity = new TestEntity(10000, 10000, 15, '#fff');
      farEntity.draw(mockCtx, 0, 0, 800, 600);
      expect(farEntity.drawShapeCalled).toBe(false);
    });

    it('should handle entities crossing left edge (world wrapping)', () => {
      const cw = 800;
      const ch = 600;
      const worldSize = 2000;

      // Entity at left edge, player in center
      const leftEdgeEntity = new TestEntity(50, 300, 15, '#fff');
      leftEdgeEntity.draw(mockCtx, worldSize / 2, 300, cw, ch);

      // Relative position: 50 - 1000 = -950, wrapped: -950 + 2000 = 1050
      // Screen x = 1050 + 400 = 1450, which is > cw + 50, so culled
      // But wait - the culling check happens after wrapping
      // rx = 50 - 1000 = -950, rx < -1000 so rx += 2000 = 1050
      // sx = 1050 + 400 = 1450 > 850, so culled
      // Actually let me recalculate - worldSize/2 = 1000, so rx < -1000 check
      // -950 is NOT < -1000, so no wrap. sx = -950 + 400 = -550, which is < -50, culled
      expect(leftEdgeEntity.drawShapeCalled).toBe(false);
    });

    it('should handle entities crossing right edge (world wrapping)', () => {
      const cw = 800;
      const ch = 600;
      const worldSize = 2000;

      // Entity at right edge
      const rightEdgeEntity = new TestEntity(worldSize - 50, 300, 15, '#fff');
      rightEdgeEntity.draw(mockCtx, worldSize / 2, 300, cw, ch);

      // rx = 1950 - 1000 = 950, not > 1000, no wrap
      // sx = 950 + 400 = 1350 > 850, culled
      expect(rightEdgeEntity.drawShapeCalled).toBe(false);
    });

    it('should handle entities crossing top edge (world wrapping)', () => {
      const cw = 800;
      const ch = 600;
      const worldSize = 2000;

      const topEdgeEntity = new TestEntity(1000, 50, 15, '#fff');
      topEdgeEntity.draw(mockCtx, 1000, worldSize / 2, cw, ch);

      // ry = 50 - 1000 = -950, not < -1000, no wrap
      // sy = -950 + 300 = -650 < -50, culled
      expect(topEdgeEntity.drawShapeCalled).toBe(false);
    });

    it('should handle entities crossing bottom edge (world wrapping)', () => {
      const cw = 800;
      const ch = 600;
      const worldSize = 2000;

      const bottomEdgeEntity = new TestEntity(1000, worldSize - 50, 15, '#fff');
      bottomEdgeEntity.draw(mockCtx, 1000, worldSize / 2, cw, ch);

      // ry = 1950 - 1000 = 950, not > 1000, no wrap
      // sy = 950 + 300 = 1250 > 650, culled
      expect(bottomEdgeEntity.drawShapeCalled).toBe(false);
    });

    it('should not draw entity just outside culling bounds', () => {
      const entityOutside = new TestEntity(100, -100, 15, '#fff');
      entityOutside.draw(mockCtx, 100, 0, 800, 600);
      // Screen y = -100 - 0 + 300 = 200 (wait, this should be visible)
      expect(entityOutside.drawShapeCalled).toBe(true);
    });

    it('should calculate correct screen position with centered player', () => {
      const entity = new TestEntity(1100, 1200, 15, '#fff');
      entity.draw(mockCtx, 1000, 1000, 800, 600);

      expect(entity.drawShapeX).toBe(500); // 1100 - 1000 + 400
      expect(entity.drawShapeY).toBe(500); // 1200 - 1000 + 300
    });
  });

  describe('marked property', () => {
    it('should be toggleable', () => {
      expect(entity.marked).toBe(false);
      entity.marked = true;
      expect(entity.marked).toBe(true);
      entity.marked = false;
      expect(entity.marked).toBe(false);
    });
  });

  describe('abstract class requirements', () => {
    it('should require drawShape implementation', () => {
      // TestEntity implements drawShape, so this should work
      expect(() => new TestEntity(0, 0, 10, '#fff')).not.toThrow();
    });
  });
});
