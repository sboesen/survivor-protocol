/**
 * Vertex shader for foam particles - provides organic jiggle and wobble.
 */
export const foamVertexShader = `
  uniform float uTime;
  attribute vec3 color;
  attribute float alpha;
  attribute float size;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;
  varying float vOffset;
  
  void main() {
    vColor = color;
    vAlpha = alpha;
    vSize = size;
    vOffset = position.x + position.y; // Seed for individual animation
    
    // Jiggle effect
    float wobble = sin(uTime * 10.0 + vOffset) * 0.05 * size;
    vec3 newPos = position + vec3(wobble, wobble * 0.5, 0.0);
    
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    gl_PointSize = (size + wobble) * 2.0 * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
