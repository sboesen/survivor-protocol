/**
 * Particle spawning system.
 *
 * Extracted from game.ts for better testability.
 */

import type { ParticleType } from '../entities/particle';

/**
 * All valid particle types in the game.
 */
export const VALID_PARTICLE_TYPES: ParticleType[] = [
  'water',
  'explosion',
  'smoke',
  'blood',
  'spark',
  'foam',
  'ripple',
  'caustic',
  'splash',
  'fire',
  'gas',
];

/**
 * Maximum number of particles allowed at once.
 */
export const MAX_PARTICLES = 2500;

/**
 * Check if a particle type is valid.
 *
 * @param type - The particle type to check
 * @returns Whether the type is valid
 */
export function isValidParticleType(type: string): type is ParticleType {
  return VALID_PARTICLE_TYPES.includes(type as ParticleType);
}

/**
 * Calculate how many particles to actually spawn.
 *
 * Takes into account the current particle count and the maximum cap.
 *
 * @param requestedCount - How many particles we want to spawn
 * @param currentParticleCount - Current number of particles
 * @param maxParticles - Maximum particles allowed (default: MAX_PARTICLES)
 * @returns Number of particles to spawn
 */
export function calculateParticleSpawnCount(
  requestedCount: number,
  currentParticleCount: number,
  maxParticles: number = MAX_PARTICLES
): number {
  if (currentParticleCount >= maxParticles) {
    return 0;
  }
  const available = maxParticles - currentParticleCount;
  return Math.min(requestedCount, available);
}

/**
 * Check if particles should be spawned.
 *
 * @param currentParticleCount - Current number of particles
 * @param maxParticles - Maximum particles allowed (default: MAX_PARTICLES)
 * @returns Whether new particles can be spawned
 */
export function canSpawnParticles(
  currentParticleCount: number,
  maxParticles: number = MAX_PARTICLES
): boolean {
  return currentParticleCount < maxParticles;
}
