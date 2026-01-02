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
  explodeRadius?: number;
  trailDamage?: number;

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
    return 2;
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
    return 25;
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

  drawIllumination(
    ctx: CanvasContext,
    px: number,
    py: number,
    cw: number,
    ch: number
  ): void {
    // Calculate screen position (same logic as Entity.draw)
    let rx = this.x - px;
    let ry = this.y - py;

    // Handle world wrapping for rendering
    if (rx < -CONFIG.worldSize / 2) rx += CONFIG.worldSize;
    if (rx > CONFIG.worldSize / 2) rx -= CONFIG.worldSize;
    if (ry < -CONFIG.worldSize / 2) ry += CONFIG.worldSize;
    if (ry > CONFIG.worldSize / 2) ry -= CONFIG.worldSize;

    const sx = rx + cw / 2;
    const sy = ry + ch / 2;

    // Culling (generous bounds for illumination)
    if (sx < -150 || sx > cw + 150 || sy < -150 || sy > ch + 150) return;

    ctx.save();

    // Larger illumination radius - more dramatic lighting
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.08;
    const illumRadius = this.radius * 12 * pulseScale;

    // Create radial gradient for ground illumination - brighter and more visible
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, illumRadius);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.5)');   // Bright warm center (increased opacity)
    gradient.addColorStop(0.2, 'rgba(255, 150, 50, 0.3)');   // Mid-inner glow
    gradient.addColorStop(0.5, 'rgba(255, 100, 30, 0.15)');  // Mid glow
    gradient.addColorStop(0.8, 'rgba(255, 60, 10, 0.05)');    // Outer glow
    gradient.addColorStop(1, 'rgba(255, 30, 0, 0)');        // Fade to nothing

    // Use lighter composite to add brightness to the scene
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, illumRadius, 0, Math.PI * 2);
    ctx.fill();

    // Add secondary brighter core for extra pop
    const coreRadius = this.radius * 4;
    const coreGradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreRadius);
    coreGradient.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
    coreGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.2)');
    coreGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(sx, sy, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
