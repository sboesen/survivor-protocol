import { CHARACTERS } from '../data/characters';
import { SaveData } from './saveData';
import { Renderer } from './renderer';
import type { GachaParticle } from '../types';

class GachaSystem {
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  active = false;
  phase = 0;
  frames = 0;
  resultChar: typeof CHARACTERS[keyof typeof CHARACTERS] | null = null;
  isDup = false;
  particles: GachaParticle[] = [];
  animationId: number | null = null;

  init(): void {
    this.canvas = document.getElementById('gacha-canvas') as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.drawIdle();
  }

  startPull(): void {
    // Cancel any existing animation loop
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (SaveData.data.gold < 500) {
      alert('Insufficient Gold!');
      return;
    }

    SaveData.data.gold -= 500;
    const goldDisplay = document.getElementById('gacha-gold');
    if (goldDisplay) goldDisplay.textContent = SaveData.data.gold.toString();

    const pool = Object.values(CHARACTERS);
    this.resultChar = pool[Math.floor(Math.random() * pool.length)] || null;
    this.isDup = this.resultChar ? SaveData.data.ownedChars.includes(this.resultChar.id) : false;

    if (this.isDup) {
      SaveData.data.gold += 250;
    } else if (this.resultChar) {
      SaveData.data.ownedChars.push(this.resultChar.id);
    }
    SaveData.save();

    this.active = true;
    this.phase = 1;
    this.frames = 0;
    this.particles = [];

    const pullBtn = document.getElementById('pull-btn') as HTMLButtonElement | null;
    const backBtn = document.getElementById('gacha-back-btn') as HTMLButtonElement | null;
    const resultEl = document.getElementById('gacha-result');

    if (pullBtn) pullBtn.disabled = true;
    if (backBtn) backBtn.disabled = true;
    if (resultEl) resultEl.textContent = 'Accessing Neural Net...';

    this.loop();
  }

  drawIdle(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, 200, 200);
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(0, 0, 200, 200);
    this.ctx.beginPath();
    this.ctx.arc(100, 100, 40, 0, Math.PI * 2);
    this.ctx.fillStyle = '#6366f1';
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '30px Arial';
    this.ctx.fillText('?', 92, 110);
  }

  loop(): void {
    if (!this.active || !this.ctx) return;

    this.frames++;
    this.ctx.clearRect(0, 0, 200, 200);
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, 200, 200);

    if (this.phase === 1) {
      const offset = Math.sin(this.frames * 0.8) * 10;
      this.ctx.save();
      this.ctx.translate(100 + offset, 100);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 40, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsl(${this.frames * 5}, 70%, 60%)`;
      this.ctx.fill();
      this.ctx.restore();

      if (this.frames > 60) {
        this.phase = 2;
        this.frames = 0;
      }
    } else if (this.phase === 2) {
      const alpha = 1 - this.frames / 20;
      this.ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      this.ctx.fillRect(0, 0, 200, 200);

      if (this.frames > 20) {
        this.phase = 3;
        this.frames = 0;

        for (let i = 0; i < 30; i++) {
          this.particles.push({
            x: 100,
            y: 100,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            c: ['#fbbf24', '#ef4444', '#38bdf8'][Math.floor(Math.random() * 3)]
          });
        }

        const resultEl = document.getElementById('gacha-result');
        if (resultEl && this.resultChar) {
          if (this.isDup) {
            resultEl.innerHTML = `<span style="color:#aaa">${this.resultChar.name} (Dup)</span>`;
          } else {
            resultEl.innerHTML = `<span style="color:#a855f7">UNLOCKED: ${this.resultChar.name}!</span>`;
          }
        }

        const goldDisplay = document.getElementById('gacha-gold');
        if (goldDisplay) goldDisplay.textContent = SaveData.data.gold.toString();

        const pullBtn = document.getElementById('pull-btn') as HTMLButtonElement | null;
        const backBtn = document.getElementById('gacha-back-btn') as HTMLButtonElement | null;
        if (pullBtn) pullBtn.disabled = false;
        if (backBtn) backBtn.disabled = false;
      }
    } else if (this.phase === 3) {
      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life > 0) {
          this.ctx!.globalAlpha = p.life;
          this.ctx!.fillStyle = p.c;
          this.ctx!.fillRect(p.x, p.y, 4, 4);
        }
      });
      this.ctx.globalAlpha = 1;

      let scale = 15;
      if (this.frames < 20) scale = 30 - this.frames;

      if (this.resultChar) {
        Renderer.drawSprite(this.ctx, this.resultChar.id, 100, 100, scale, 1, false);
      }

      // End animation after showing result
      if (this.frames > 60) {
        this.active = false;
        this.drawIdle();
        return;
      }
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }
}

export const GachaAnim = new GachaSystem();
