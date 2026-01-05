/**
 * Fragment shader for a high-fidelity water surface.
 * Features:
 * - Multi-layered scrolling noise
 * - Caustics approximation
 * - Specular glints
 * - Depth color gradient
 */
export const waterFragmentShader = `
uniform float uTime;
uniform vec3 uColorDeep;
uniform vec3 uColorShallow;
varying vec2 vUv;
varying vec3 vWorldPosition;

// Simple hash function for noise
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// 2D Noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Multi-layered noise for wave patterns
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

void main() {
    // Scrolling noise patterns
    vec2 p = vWorldPosition.xy * 0.01;
    
    float n1 = fbm(p + uTime * 0.1);
    float n2 = fbm(p * 1.5 - uTime * 0.15);
    float combinedNoise = mix(n1, n2, 0.5);
    
    // Deep to shallow gradient
    vec3 finalColor = mix(uColorDeep, uColorShallow, combinedNoise);
    
    // Caustics: sharp scrolling cells
    vec2 causticP = vWorldPosition.xy * 0.04;
    float c1 = noise(causticP + uTime * 0.3);
    float c2 = noise(causticP * 1.2 - uTime * 0.4);
    float caustic = pow(min(c1, c2), 3.0) * 4.0;
    finalColor += caustic * 0.15;
    
    // Specular glints: very sharp small dots
    float spec = pow(combinedNoise, 20.0) * 1.5;
    finalColor += spec * vec3(0.8, 0.9, 1.0);
    
    // Surface highlights
    float surface = smoothstep(0.4, 0.6, combinedNoise);
    finalColor += surface * 0.05;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
