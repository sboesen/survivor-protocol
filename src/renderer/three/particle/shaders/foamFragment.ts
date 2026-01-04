/**
 * Fragment shader for foam particles - white bubble with shine.
 */
export const foamFragmentShader = `varying vec3 vColor;
varying float vAlpha;
varying float vSize;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord) * 2.0;
  if (dist > 1.0) discard;

  float alpha = (1.0 - smoothstep(0.0, 0.8, dist)) * vAlpha;
  vec3 finalColor = vColor;

  float shine = smoothstep(0.6, 0.0, length(coord - vec2(-0.15, -0.15))) * 0.6 * vAlpha;
  finalColor += vec3(shine);

  gl_FragColor = vec4(finalColor, alpha);
}`;