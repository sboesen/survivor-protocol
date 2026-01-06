/**
 * Vertex shader for cinematic Flame Cone.
 * Maps UV coordinates for polar-based fire simulation.
 */
export const flameConeVertexShader = `
precision highp float;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
