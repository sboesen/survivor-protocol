/**
 * Vertex shader for high-fidelity liquid bubbles.
 * Handles UV passing and liquid-like surface tension wobble.
 */
export const bubbleVertexShader = `
varying vec2 vUv;
varying float vOffset;
uniform float uTime;

void main() {
    vUv = uv;
    vOffset = position.x + position.y;
    
    // Multi-frequency organic liquid wobble
    float wobble = sin(uTime * 4.2 + vOffset * 3.0) * 0.08 
                 + cos(uTime * 2.8 - vOffset * 1.5) * 0.05
                 + sin(uTime * 6.5 + vOffset * 5.0) * 0.02;
                 
    // Subtle "swimming" vertical oscillation
    float swim = sin(uTime * 2.5 + vOffset) * 0.04;
    
    // Organic deformation along edges
    vec3 animatedPos = position + vec3(wobble, wobble * 0.7 + swim, 0.0);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPos, 1.0);
}
`;
