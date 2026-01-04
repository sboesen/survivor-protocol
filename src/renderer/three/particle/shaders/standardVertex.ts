/**
 * Vertex shader for standard particles with color, alpha, and size.
 */
export const standardVertexShader = `attribute vec3 color;
attribute float alpha;
attribute float size;
varying vec3 vColor;
varying float vAlpha;
varying float vSize;
void main() {
  vColor = color;
  vAlpha = alpha;
  vSize = size;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * 2.0 * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}`;

export const softFragmentShader = `varying vec3 vColor;
varying float vAlpha;
varying float vSize;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord) * 2.0;
  if (dist > 1.0) discard;
  float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}`;
