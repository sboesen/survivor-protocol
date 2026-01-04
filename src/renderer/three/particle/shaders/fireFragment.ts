/**
 * Fragment shader for fire particles - dynamic color shift white -> yellow -> orange -> red.
 */
export const fireFragmentShader = `varying float vLife;
varying float vSize;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord) * 2.0;

  float alpha = (1.0 - smoothstep(0.0, 1.0, dist));
  if (alpha < 0.01) discard;

  float progress = 1.0 - vLife;

  vec3 fireColor;
  if (progress < 0.2) {
    fireColor = vec3(1.0, 1.0, 1.0);
  } else if (progress < 0.5) {
    fireColor = vec3(1.0, 0.8, 0.0);
  } else {
    fireColor = vec3(1.0, 0.27, 0.0);
  }

  float core = smoothstep(0.5, 0.0, dist) * 0.5 * vLife;
  fireColor += vec3(core);

  alpha *= vLife;
  gl_FragColor = vec4(fireColor, alpha);
}`;