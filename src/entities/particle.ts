import { CONFIG } from '../config';

export type ParticleType = 'water' | 'explosion' | 'smoke' | 'blood' | 'spark' | 'foam' | 'ripple' | 'caustic' | 'splash';

export interface ParticleConfig {
  type: ParticleType;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life?: number;
  size?: number;
  color?: string;
}

export interface ParticleSpawnConfig {
  type: ParticleType;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life?: number;
  size?: number;
  color?: string;
}

export class Particle {
  marked = false;

  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;

  constructor(config: ParticleSpawnConfig) {
    this.x = config.x;
    this.y = config.y;
    this.type = config.type;
    this.color = config.color || this.getDefaultColor();
    this.life = config.life ?? this.getDefaultLife();
    this.maxLife = this.life;
    this.size = config.size ?? this.getDefaultSize();

    // Random velocity spread if not specified
    const speed = this.getDefaultSpeed();
    const angle = Math.random() * Math.PI * 2;
    this.vx = config.vx ?? Math.cos(angle) * speed * (0.5 + Math.random() * 0.5);
    this.vy = config.vy ?? Math.sin(angle) * speed * (0.5 + Math.random() * 0.5);
  }

  private getDefaultColor(): string {
    switch (this.type) {
      case 'water': return '#3b82f6';
      case 'explosion': return '#f97316';
      case 'smoke': return '#64748b';
      case 'blood': return '#dc2626';
      case 'spark': return '#fbbf24';
      case 'foam': return '#e0f2fe';
      case 'ripple': return '#60a5fa';
      case 'caustic': return '#93c5fd';
      case 'splash': return '#bfdbfe';
      default: return '#fff';
    }
  }

  private getDefaultLife(): number {
    switch (this.type) {
      case 'water': return 30 + Math.random() * 20;
      case 'explosion': return 15 + Math.random() * 10;
      case 'smoke': return 40 + Math.random() * 30;
      case 'blood': return 60 + Math.random() * 30;
      case 'spark': return 10 + Math.random() * 10;
      case 'foam': return 20 + Math.random() * 15;
      case 'ripple': return 25 + Math.random() * 10;
      case 'caustic': return 50 + Math.random() * 30;
      case 'splash': return 15 + Math.random() * 10;
      default: return 30;
    }
  }

  private getDefaultSize(): number {
    switch (this.type) {
      case 'water': return 3 + Math.random() * 3;
      case 'explosion': return 3 + Math.random() * 4;
      case 'smoke': return 4 + Math.random() * 6;
      case 'blood': return 2 + Math.random() * 2;
      case 'spark': return 1 + Math.random() * 2;
      case 'foam': return 2 + Math.random() * 3;
      case 'ripple': return 3;
      case 'caustic': return 10 + Math.random() * 15;
      case 'splash': return 5 + Math.random() * 5;
      default: return 3;
    }
  }

  private getDefaultSpeed(): number {
    switch (this.type) {
      case 'water': return 1;
      case 'explosion': return 3;
      case 'smoke': return 0.5;
      case 'blood': return 2;
      case 'spark': return 4;
      case 'foam': return 0.3;
      case 'ripple': return 0;
      case 'caustic': return 0.2;
      case 'splash': return 2;
      default: return 1;
    }
  }

  update(): void {
    this.life--;

    // Physics based on type
    switch (this.type) {
      case 'water':
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05;
        this.vx *= 0.98;
        break;
      case 'explosion':
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        break;
      case 'smoke':
        this.x += this.vx;
        this.y += this.vy - 0.3;
        this.vx *= 0.99;
        this.size += 0.1;
        break;
      case 'blood':
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.vx *= 0.95;
        break;
      case 'spark':
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15;
        break;
      case 'foam':
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.size += 0.05;
        break;
      case 'ripple':
        // Ripples expand and stay in place
        this.size += 0.6;
        break;
      case 'caustic':
        // Caustics drift slowly and shimmer
        this.x += this.vx;
        this.y += this.vy;
        this.size += Math.sin(this.life * 0.2) * 0.2;
        break;
      case 'splash':
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.08;
        this.vx *= 0.97;
        break;
    }

    // Wrap around world
    const wraps = this.type === 'water' || this.type === 'foam' || this.type === 'ripple' || this.type === 'caustic' || this.type === 'splash';
    if (wraps) {
      this.x = (this.x + CONFIG.worldSize) % CONFIG.worldSize;
      this.y = (this.y + CONFIG.worldSize) % CONFIG.worldSize;
    }

    if (this.life <= 0) {
      this.marked = true;
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cw: number,
    ch: number
  ): void {
    // Guard against invalid values
    if (!isFinite(this.x) || !isFinite(this.y) || !isFinite(this.size) || !isFinite(this.life)) {
      this.marked = true;
      return;
    }

    let rx = this.x - px;
    let ry = this.y - py;

    // Only wrap water particles - others cull if too far
    const wraps = this.type === 'water' || this.type === 'foam' || this.type === 'ripple' || this.type === 'caustic' || this.type === 'splash';
    if (wraps) {
      if (rx < -CONFIG.worldSize / 2) rx += CONFIG.worldSize;
      if (rx > CONFIG.worldSize / 2) rx -= CONFIG.worldSize;
      if (ry < -CONFIG.worldSize / 2) ry += CONFIG.worldSize;
      if (ry > CONFIG.worldSize / 2) ry -= CONFIG.worldSize;
    } else {
      if (Math.abs(rx) > CONFIG.worldSize / 2 || Math.abs(ry) > CONFIG.worldSize / 2) return;
    }

    const sx = rx + cw / 2;
    const sy = ry + ch / 2;

    // Culling
    if (sx < -50 || sx > cw + 50 || sy < -50 || sy > ch + 50) return;

    if (!isFinite(sx) || !isFinite(sy)) return;

    // Save context state
    ctx.save();

    const progress = 1 - (this.life / this.maxLife);
    const alpha = Math.max(0, 1 - progress);

    // Draw based on type
    switch (this.type) {
      case 'water': {
        // Round water droplet with gradient
        const r = Math.max(1, this.size);
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'splash': {
        // Larger water splash droplet
        const r = Math.max(2, this.size);
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        // Outer ring
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'ripple': {
        // Expanding concentric rings
        const r = this.size;
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1, 2 - progress);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
        // Second ring
        if (r > 5) {
          ctx.globalAlpha = alpha * 0.25;
          ctx.beginPath();
          ctx.arc(sx, sy, r * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      case 'caustic': {
        // Wavy light pattern - multiple overlapping translucent circles
        const shimmer = (Math.sin(Date.now() * 0.005 + this.x * 0.1) + 1) / 2;
        const r = this.size;
        ctx.globalAlpha = 0.15 + shimmer * 0.1;
        ctx.fillStyle = this.color;
        // Main blob
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        // Smaller blobs for organic look
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.arc(sx + r * 0.3, sy - r * 0.2, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx - r * 0.2, sy + r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'foam': {
        // White bubble
        const r = Math.max(1, this.size);
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'explosion':
      case 'spark': {
        const r = Math.max(1, this.size);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'smoke': {
        const r = Math.max(2, this.size);
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'blood': {
        const r = Math.max(1, this.size);
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default: {
        const r = Math.max(1, this.size);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }
}
