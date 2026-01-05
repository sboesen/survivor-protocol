/**
 * Fragment shader for "Complex Water" liquid bubbles.
 * Features:
 * - Multi-layered FBM noise for internal liquid refraction
 * - Sharp caustics scrolling inside the volume
 * - Chromatic aberration-like rainbow edges
 * - High-intensity specular "wet" highlights
 */
export const bubbleFragmentShader = `
uniform float uTime;
varying vec2 vUv;
varying float vOffset;

// Simple hash for noise
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// 2D Noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// Fractional Brownian Motion for liquid refraction
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 3; i++) {
        v += a * noise(p);
        p = m * p;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 coord = vUv - vec2(0.5);
    float dist = length(coord) * 2.0;
    
    // Organic Breathing/Pulsing Effect
    float pulse = 1.0 + sin(uTime * 4.0 + vOffset) * 0.05;
    float pulsedDist = dist / pulse;

    // Refractive Distortion: Warp the UVs based on liquid FBM
    vec2 warpedUV = vUv + (fbm(vUv * 4.0 + uTime * 0.5) - 0.5) * 0.15;
    
    // Sharp liquid edge mask with breathing pulse
    if (pulsedDist > 1.0) discard;
    float edge = smoothstep(1.0, 0.95, pulsedDist);

    // Deep liquid color tinted by refraction and time
    vec3 waterColor1 = vec3(0.05, 0.35, 0.65);
    vec3 waterColor2 = vec3(0.4, 0.85, 1.0);
    float colorNoise = fbm(warpedUV * 6.0 - uTime * 0.3);
    vec3 baseColor = mix(waterColor1, waterColor2, colorNoise);
    
    // Internal Caustics - High intensity 
    vec2 causticUV = warpedUV * 3.5 + uTime * 0.7;
    float c1 = noise(causticUV);
    float c2 = noise(causticUV * 1.5 - uTime * 0.9);
    float caustic = pow(min(c1, c2), 4.0) * 15.0;
    baseColor += caustic * 0.5;

    // Surface highlights (Specular)
    vec2 specPos = vec2(-0.25, -0.25) + vec2(sin(uTime * 2.0), cos(uTime * 2.0)) * 0.05;
    float spec = smoothstep(0.35, 0.0, length(coord - specPos)) * 0.9;
    float rim = pow(1.0 - pulsedDist, 3.0) * 0.5;
    
    vec3 finalColor = baseColor + spec + rim;

    // Enhanced Shimmering Iridescence
    float shimmer = sin(uTime * 3.5 + pulsedDist * 12.0) * 0.5 + 0.5;
    vec3 rainbow = 0.5 + 0.5 * cos(uTime * 2.5 + pulsedDist * 10.0 + vec3(0, 2, 4));
    finalColor = mix(finalColor, rainbow, smoothstep(0.8, 1.0, pulsedDist) * 0.4 * shimmer);

    gl_FragColor = vec4(finalColor, edge * 0.92);
}
`;
