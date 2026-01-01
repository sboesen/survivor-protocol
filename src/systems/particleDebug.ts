import { Particle, type ParticleType } from '../entities/particle';
import type { ParticleSpawnConfig } from '../entities/particle';

class ParticleDebugSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private active = false;
  private animationId: number | null = null;
  private rippleCounter = 0;

  init(): void {
    this.canvas = document.getElementById('particle-debug-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
  }

  start(): void {
    if (!this.canvas || !this.ctx) return;
    this.active = true;
    this.loop();
  }

  stop(): void {
    this.active = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  spawn(type: ParticleType): void {
    if (!this.canvas || !this.ctx) {
      this.init();
      if (!this.canvas || !this.ctx) return;
    }

    if (!this.active) this.start();

    // Spawn particles at random positions in canvas
    for (let i = 0; i < 3; i++) {
      const x = 50 + Math.random() * (this.canvas!.width - 100);
      const y = 50 + Math.random() * (this.canvas!.height - 100);

      const config: ParticleSpawnConfig = {
        type,
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      };

      const p = new Particle(config);
      // Override life to make particles persist
      p.life = 999999;
      p.maxLife = 999999;

      this.particles.push(p);
    }

    // Limit particles
    if (this.particles.length > 100) {
      this.particles = this.particles.slice(-100);
    }
  }

  clear(): void {
    this.particles = [];
  }

  private loop(): void {
    if (!this.active || !this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    this.rippleCounter++;

    // Clear with dark background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, cw, ch);

    // Draw grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < cw; x += 20) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
    }
    for (let y = 0; y < ch; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
    }
    ctx.stroke();

    // Update and draw particles
    this.particles.forEach(p => {
      // Update physics
      p.x += p.vx || 0;
      p.y += p.vy || 0;

      // Special behavior per type
      if (p.type === 'ripple') {
        p.size += 0.3;
        if (p.size > 40) p.size = 3;
      }

      // Bounce off walls
      if (p.x < 10) { p.x = 10; p.vx = -(p.vx || 0); }
      if (p.x > cw - 10) { p.x = cw - 10; p.vx = -(p.vx || 0); }
      if (p.y < 10) { p.y = 10; p.vy = -(p.vy || 0); }
      if (p.y > ch - 10) { p.y = ch - 10; p.vy = -(p.vy || 0); }

      // Draw using the same logic as the game
      this.drawParticle(ctx, p);
    });

    // Draw particle count
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText(`Particles: ${this.particles.length}`, 5, 12);

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const sx = p.x;
    const sy = p.y;

    ctx.save();

    const r = Math.max(1, p.size);

    switch (p.type) {
      case 'water': {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'splash': {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        // Outer ring
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'ripple': {
        const alpha = Math.max(0.1, 1 - p.size / 40);
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 3 - p.size / 15);
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.stroke();
        // Second ring
        if (p.size > 10) {
          ctx.globalAlpha = alpha * 0.25;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      case 'caustic': {
        const shimmer = (Math.sin(this.rippleCounter * 0.05 + p.x * 0.1) + 1) / 2;
        ctx.globalAlpha = 0.15 + shimmer * 0.1;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        // Smaller blobs
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.arc(sx + r * 0.3, sy - r * 0.2, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'foam': {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'explosion':
      case 'spark':
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'smoke': {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'blood': {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default: {
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }
}

export const ParticleDebug = new ParticleDebugSystem();
