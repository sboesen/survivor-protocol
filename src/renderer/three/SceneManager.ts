import * as THREE from 'three';

/**
 * Manages the Three.js scene, camera, and renderer for the game.
 * Uses orthographic projection for 2D pixel art style.
 */
export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    // Scene with transparent background (game draws its own floor)
    this.scene = new THREE.Scene();

    // Orthographic camera for 2D rendering
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 380; // Base view size (zoomed out)
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      2000
    );
    // Position camera to look at scene from positive Z
    this.camera.position.set(0, 0, 100);
    this.camera.lookAt(0, 0, 0);
    // Flip Y axis to match Canvas 2D coordinate system (positive Y is down)
    this.camera.scale.y = -1;

    // WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enable auto clear for proper Three.js rendering
    this.renderer.autoClear = true;
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.renderer.domElement.id = 'three-canvas';
    // Insert AFTER the canvas so Three.js sprites appear on top
    this.canvas.parentNode?.insertBefore(this.renderer.domElement, this.canvas.nextSibling);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.pointerEvents = 'none'; // Let clicks pass through to canvas
    this.renderer.domElement.style.zIndex = '10'; // Above floor, below UI
  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    const viewSize = 380;
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.scale.y = -1; // Preserve Y-flip
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, 0, 0);
    this.renderer.setSize(width, height);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }
}
