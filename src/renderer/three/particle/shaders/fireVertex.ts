/**
 * Vertex shader for fire particles with life attribute (no color).
 */
export const fireVertexShader = `attribute float life;
attribute float size;
varying float vLife;
varying float vSize;
void main() {
  vLife = life;
  vSize = size;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}`;