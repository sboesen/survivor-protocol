import * as THREE from 'three';
import type { CameraController } from '../CameraController';
import type { Particle } from '../../../entities/particle';

export interface ParticleScene {
  addToScene(object: THREE.Object3D): void;
  removeFromScene(object: THREE.Object3D): void;
}

export type ParticleType =
  | 'water'
  | 'splash'
  | 'ripple'
  | 'caustic'
  | 'foam'
  | 'explosion'
  | 'spark'
  | 'fire'
  | 'smoke'
  | 'blood'
  | 'gas';

export interface ParticleRenderer {
  points: THREE.Points;
  needsColor: boolean;
  needsAlpha: boolean;
  needsOffset: boolean;
  needsLife: boolean;
  update(particles: Particle[], camera: CameraController, time: number): void;
}
