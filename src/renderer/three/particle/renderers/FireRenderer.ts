import * as THREE from 'three';
import type { CameraController } from '../../CameraController';
import type { Particle } from '../../../../entities/particle';
import { fireVertexShader } from '../shaders/fireVertex';
import { fireFragmentShader } from '../shaders/fireFragment';
import { ParticleRenderer } from '../interfaces';

export class FireRenderer implements ParticleRenderer {
  points: THREE.Points;
  needsColor = false;
  needsAlpha = false;
  needsOffset = false;
  needsLife = true;

  private geometry: THREE.BufferGeometry;
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(maxParticles * 3);
    const lives = new Float32Array(maxParticles);
    const sizes = new Float32Array(maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('life', new THREE.BufferAttribute(lives, 1));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: fireVertexShader,
      fragmentShader: fireFragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.visible = false;
  }

  update(particles: Particle[], camera: CameraController): void {
    const count = Math.min(particles.length, this.maxParticles);

    if (count === 0) {
      this.points.visible = false;
      return;
    }

    const positions = this.geometry.attributes.position.array as Float32Array;
    const lives = this.geometry.attributes.life.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const pt = particles[i];
      const pos = camera.getWrappedRenderPosition(pt.x, pt.y);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = 12;
      lives[i] = Math.max(0, pt.life / pt.maxLife);
      sizes[i] = pt.size;
    }

    this.geometry.setDrawRange(0, count);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.life.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.points.visible = true;
  }
}
