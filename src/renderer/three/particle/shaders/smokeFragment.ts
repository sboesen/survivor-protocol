/**
 * Fragment shader for smoke particles - grey puffs.
 */
export const smokeFragmentShader = `varying float vAlpha;
varying float vSize;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord) * 2.0;
  if (dist > 1.0) discard;

  float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * vAlpha;
  vec3 smokeColor = vec3(0.39, 0.28, 0.53);
  gl_FragColor = vec4(smokeColor, alpha);
}`;