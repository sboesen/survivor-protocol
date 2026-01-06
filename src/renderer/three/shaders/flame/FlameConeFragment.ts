/**
 * Fragment shader for cinematic Flame Cone.
 * Uses scrolling FBM noise and polar mapping for organic flame effects.
 */
export const flameConeFragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColorSource;
uniform vec3 uColorCore;
uniform vec3 uColorEdge;
uniform float uIntensity;
uniform float uSpread;

varying vec2 vUv;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = m * p;
        a *= 0.5;
    }
    return v;
}

// Helper for distortion damping at the source
float distStep(vec2 p, float edge) {
    return smoothstep(0.0, edge, length(p));
}

void main() {
    // Polar coordinates: source at (0.5, 0.0)
    vec2 centeredUv = vUv - vec2(0.5, 0.0);
    
    // Distort UVs for organic look (Drastically reduced for stability)
    float distortion = fbm(vUv * 1.5 + uTime * 0.3) * 0.03;
    centeredUv += distortion * (distStep(centeredUv, 0.2));
    
    float dist = length(centeredUv);
    float angle = atan(centeredUv.x, centeredUv.y);

    // Cone mask based on uSpread with noise-modulated edges
    float angleFreq = angle * 1.0;
    float n = fbm(vec2(angleFreq, dist - uTime * 1.0));
    
    // Soften and wobble the cone edges (Minimal wobble, BLURRED edges)
    float wobble = (n - 0.5) * 0.04;
    // Increased range from 0.48-0.52 to 0.35-0.65 for blurring
    float coneMask = 1.0 - smoothstep(uSpread * (0.35 + wobble), uSpread * (0.65 + wobble), abs(angle));
    
    // Soften the tip and base (More gradual tip falloff)
    coneMask *= 1.0 - smoothstep(0.6 + n * 0.05, 1.0, dist);
    coneMask *= smoothstep(0.0, 0.03, dist); // Fade in at source
    
    // Final alpha with organic "shredding" (Subtle)
    float edgeAlpha = smoothstep(0.1, 0.4, n * (1.1 - dist));
    float alpha = coneMask * edgeAlpha * uIntensity;
    
    if (alpha < 0.05) discard;
    
    // Color progression (Tighter core)
    vec3 color = mix(uColorSource, uColorCore, dist * 1.1);
    color = mix(color, uColorEdge, dist * 1.6);
    color *= (1.0 + n * 0.2); // Minimal flickering
    
    gl_FragColor = vec4(color, alpha);
}
`;
