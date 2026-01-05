/**
 * Fragment shader for foam particles - advanced iridescent bubble with specular highlights.
 */
export const foamFragmentShader = `
  uniform float uTime;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;
  varying float vOffset;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord) * 2.0;
    if (dist > 1.0) discard;

    // Base bubble - Fresnel-like soft center
    float edge = smoothstep(1.0, 0.8, dist);
    float alpha = edge * vAlpha;
    
    // Iridescence (rainbow edges)
    vec3 rainbow = 0.5 + 0.5 * cos(uTime * 2.0 + dist * 5.0 + vec3(0, 2, 4));
    vec3 baseColor = mix(vColor, rainbow, smoothstep(0.7, 1.0, dist) * 0.4);

    // Specular highlighting
    float mainShine = smoothstep(0.4, 0.0, length(coord - vec2(-0.2, -0.2)));
    float secondaryShine = smoothstep(0.2, 0.0, length(coord - vec2(0.15, 0.1))) * 0.5;
    
    vec3 finalColor = baseColor + (mainShine + secondaryShine) * vAlpha;
    
    // Subtle internal shimmer
    float shimmer = sin(uTime * 5.0 + vOffset) * 0.05;
    alpha *= (0.8 + shimmer);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;