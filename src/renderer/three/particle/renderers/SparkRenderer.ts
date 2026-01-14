import * as THREE from 'three';
import type { CameraController } from '../../CameraController';
import type { Particle } from '../../../../entities/particle';
import { standardVertexShader, softFragmentShader } from '../shaders/standardVertex';
import { ParticleRenderer } from '../interfaces';

export class SparkRenderer implements ParticleRenderer {
  points: THREE.Points;
  needsColor = true;
  needsAlpha = true;
  needsOffset = false;
  needsLife = false;

  private geometry: THREE.BufferGeometry;
  private maxParticles: number;

  constructor(maxParticles: number = 300) {
    this.maxParticles = maxParticles;
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const alphas = new Float32Array(maxParticles);
    const sizes = new Float32Array(maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: standardVertexShader,
      fragmentShader: softFragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false,
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
    const colors = this.geometry.attributes.color.array as Float32Array;
    const alphas = this.geometry.attributes.alpha.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const pt = particles[i];
      const pos = camera.getWrappedRenderPosition(pt.x, pt.y);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = 12;

      const color = new THREE.Color(pt.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      alphas[i] = Math.max(0, pt.life / pt.maxLife);
      sizes[i] = pt.size;
    }

    this.geometry.setDrawRange(0, count);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.points.visible = true;
  }
}
