/**
 * Fragment shader for expanding ripple rings.
 */
export const rippleFragmentShader = `varying vec3 vColor;
varying float vAlpha;
varying float vSize;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord) * 2.0;

  float ringWidth = 0.15;
  float ringRadius = 0.35;
  float ring = 1.0 - smoothstep(0.0, ringWidth, abs(dist - ringRadius));

  float innerRing = 0.0;
  if (vSize > 5.0) {
    float innerRadius = 0.2;
    innerRing = 0.5 * (1.0 - smoothstep(0.0, ringWidth, abs(dist - innerRadius)));
  }

  float alpha = (ring + innerRing) * vAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor, alpha);
}`;