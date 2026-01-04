/**
 * Fragment shader for caustic particles with shimmer effect.
 */
export const causticFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;
  varying float vOffset;
  uniform float time;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord) * 2.0;
    if (dist > 1.0) discard;

    float shimmer = (sin(time * 3.0 + vOffset) + 1.0) * 0.5 * 0.1;
    float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * (vAlpha + shimmer);

    vec2 offset1 = vec2(0.15, -0.1);
    vec2 offset2 = vec2(-0.1, 0.15);
    float blob1 = (1.0 - smoothstep(0.0, 1.0, length(coord - offset1) * 2.0));
    float blob2 = (1.0 - smoothstep(0.0, 1.0, length(coord - offset2) * 2.5));
    alpha += (blob1 + blob2) * 0.1;

    gl_FragColor = vec4(vColor, alpha);
  }
`;
