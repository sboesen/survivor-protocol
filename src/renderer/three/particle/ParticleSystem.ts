import * as THREE from 'three';
import type { CameraController } from '../CameraController';
import type { Particle } from '../../../entities/particle';
import type { ParticleRenderer, ParticleScene, ParticleType } from './interfaces';

import { WaterRenderer } from './renderers/WaterRenderer';
import { SplashRenderer } from './renderers/SplashRenderer';
import { RippleRenderer } from './renderers/RippleRenderer';
import { CausticRenderer } from './renderers/CausticRenderer';
import { FoamRenderer } from './renderers/FoamRenderer';
import { ExplosionRenderer } from './renderers/ExplosionRenderer';
import { SparkRenderer } from './renderers/SparkRenderer';
import { FireRenderer } from './renderers/FireRenderer';
import { SmokeRenderer } from './renderers/SmokeRenderer';
import { BloodRenderer } from './renderers/BloodRenderer';
import { GasRenderer } from './renderers/GasRenderer';

export class ParticleSystem {
  private renderers: Record<ParticleType, ParticleRenderer>;
  private scene: ParticleScene;

  constructor(scene: ParticleScene, maxParticles: number = 500) {
    this.scene = scene;

    this.renderers = {
      water: new WaterRenderer(maxParticles),
      splash: new SplashRenderer(maxParticles),
      ripple: new RippleRenderer(maxParticles),
      caustic: new CausticRenderer(maxParticles),
      foam: new FoamRenderer(maxParticles),
      explosion: new ExplosionRenderer(maxParticles),
      spark: new SparkRenderer(maxParticles),
      fire: new FireRenderer(maxParticles),
      smoke: new SmokeRenderer(maxParticles),
      blood: new BloodRenderer(maxParticles),
      gas: new GasRenderer(maxParticles),
    };

    Object.values(this.renderers).forEach(renderer => {
      this.scene.addToScene(renderer.points);
    });
  }

  update(particles: Particle[], camera: CameraController, time: number): void {
    const particlesByType = new Map<ParticleType, Particle[]>();

    particles.forEach(pt => {
      if (!particlesByType.has(pt.type)) {
        particlesByType.set(pt.type, []);
      }
      particlesByType.get(pt.type)!.push(pt);
    });

    particlesByType.forEach((typeParticles, type) => {
      const renderer = this.renderers[type];
      if (renderer) {
        renderer.update(typeParticles, camera, time);
      }
    });
  }

  cleanup(): void {
    Object.values(this.renderers).forEach(renderer => {
      this.scene.removeFromScene(renderer.points);
      if (renderer.points.geometry) {
        renderer.points.geometry.dispose();
      }
      if (renderer.points.material) {
        if (Array.isArray(renderer.points.material)) {
          renderer.points.material.forEach(m => m.dispose());
        } else {
          (renderer.points.material as THREE.Material).dispose();
        }
      }
    });
  }
}
