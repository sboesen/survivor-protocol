import { CONFIG } from '../config';
import type { CanvasContext } from '../types';
import { Entity } from './entity';

/**
 * FireballProjectile - A homing fireball that emits particles as a trail.
 *
 * Particle Emission Protocol:
 * - Trail particles: 6 small particles every 2 frames
 * - Explosion particles: 60 particles on impact
 *
 * Visual: White-hot core with orange halo
 */
export class FireballProjectile extends Entity {
  vx: number;
  vy: number;
  dmg: number;
  dur: number;
  pierce: number;
  isCrit: boolean;
  hitList: Entity[];

  // Visual state
  private pulsePhase: number;
  private rotation: number;

  // Particle emission counter
  private particleTimer: number;

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number,
    dmg: number,
    dur: number,
    pierce: number,
    isCrit: boolean
  ) {
    super(x, y, 6, '#ff4400'); // Radius 6, orange color
    this.dmg = dmg;
    this.dur = dur;
    this.pierce = pierce;
    this.isCrit = isCrit;
    this.hitList = [];

    // Calculate initial velocity towards target
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;

    this.pulsePhase = 0;
    this.rotation = 0;
    this.particleTimer = 0;
  }

  update(): void {
    this.x = (this.x + this.vx + CONFIG.worldSize) % CONFIG.worldSize;
    this.y = (this.y + this.vy + CONFIG.worldSize) % CONFIG.worldSize;

    // Visual updates
    this.pulsePhase += 0.2;
    this.rotation += 0.15;

    this.dur--;
    if (this.dur <= 0) this.marked = true;
  }

  /**
   * Check if this fireball should emit trail particles this frame.
   * Emits every 2 frames.
   */
  shouldEmitTrail(): boolean {
    this.particleTimer++;
    if (this.particleTimer >= 2) {
      this.particleTimer = 0;
      return true;
    }
    return false;
  }

  /**
   * Get the number of trail particles to emit.
   */
  getTrailParticleCount(): number {
    return 6;
  }

  /**
   * Get the size of trail particles (smaller than default).
   */
  getTrailParticleSize(): number {
    return 1.5;
  }

  /**
   * Get the number of explosion particles to emit on impact.
   */
  getExplosionParticleCount(): number {
    return 60;
  }

  drawShape(ctx: CanvasContext, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);

    // Pulsing halo (outer ring)
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.2;
    const haloSize = this.radius * 2.5 * pulseScale;

    // Outer glow (orange/red)
    const glowGradient = ctx.createRadialGradient(0, 0, this.radius * 0.5, 0, 0, haloSize);
    glowGradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
    glowGradient.addColorStop(0.4, 'rgba(255, 100, 0, 0.4)');
    glowGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, haloSize, 0, Math.PI * 2);
    ctx.fill();

    // Core (white-hot)
    const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.5, '#ffff00');
    coreGradient.addColorStop(1, '#ff8800');

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Spinning inner detail
    ctx.rotate(this.rotation);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
    }
    ctx.stroke();

    ctx.restore();
  }
}
