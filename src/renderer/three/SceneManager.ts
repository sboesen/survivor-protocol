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
    // Flip Y-axis to match Canvas 2D (positive Y is down)
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 600; // Base view size
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      -viewSize, // Flip top
      viewSize,  // Flip bottom
      1,
      1000
    );
    this.camera.position.z = 100;
    // Scale Y by -1 to flip the coordinate system
    this.camera.scale.y = -1;

    // WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Disable clearing - we'll draw our own background
    this.renderer.autoClear = false;
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
  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    const viewSize = 600;
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = -viewSize;
    this.camera.bottom = viewSize;
    this.camera.scale.y = -1; // Maintain Y flip
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render(): void {
    this.renderer.clear();
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
