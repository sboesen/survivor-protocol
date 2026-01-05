/**
 * Vertex shader for the complex water surface.
 * Handles UV passing and optional vertex displacement.
 */
export const waterVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
uniform float uTime;

void main() {
    vUv = uv;
    
    // We use the world position for noise to ensure seamless tiling when the player moves
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    // Slight wave displacement
    float wave = sin(worldPosition.x * 0.05 + uTime * 2.0) * cos(worldPosition.y * 0.05 + uTime * 1.5) * 2.0;
    vec3 animatedPos = position + vec3(0.0, 0.0, wave);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPos, 1.0);
}
`;
