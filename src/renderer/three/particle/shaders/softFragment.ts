/**
 * Fragment shader for simple soft particles (splash, spark, blood, gas).
 */
export const softFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord) * 2.0;
    if (dist > 1.0) discard;

    float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;
