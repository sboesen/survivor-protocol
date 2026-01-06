import * as THREE from 'three';

/**
 * Manages Three.js scene, camera, and renderer for game.
 * Uses orthographic projection for 2D pixel art style.
 */
export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer!: THREE.WebGLRenderer;

  constructor() {
    // Scene with dark background color
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    // Orthographic camera for 2D rendering
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 350;
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
  }

  init(): void {
    // Clean up any existing Three.js canvas from previous HMR cycles
    const existingCanvas = document.getElementById('three-canvas');
    if (existingCanvas) {
      existingCanvas.remove();
    }

    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const pixelRatio = Math.min(Math.max(1, Math.round(window.devicePixelRatio)), 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.autoClear = false; // We'll clear manually if needed
    this.renderer.setClearColor(0x0a0a0f, 1);



    // Add Three.js canvas to DOM - directly to body for testing
    const threeCanvas = this.renderer.domElement;
    threeCanvas.id = 'three-canvas';
    threeCanvas.style.position = 'fixed';
    threeCanvas.style.top = '0';
    threeCanvas.style.left = '0';
    threeCanvas.style.width = '100%';
    threeCanvas.style.height = '100%';
    threeCanvas.style.zIndex = '0';
    threeCanvas.style.pointerEvents = 'none';

    const container = document.getElementById('game-container');
    if (container) {
      container.insertBefore(threeCanvas, container.firstChild);
    } else {
      document.body.appendChild(threeCanvas);
    }


    // Ensure camera projection is up to date
    this.camera.updateProjectionMatrix();



  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    const viewSize = 350;
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.scale.y = -1; // Preserve Y-flip
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, 0, 0);
    if (this.renderer) {
      this.renderer.setSize(width, height);
      const pixelRatio = Math.min(Math.max(1, Math.round(window.devicePixelRatio)), 2);
      this.renderer.setPixelRatio(pixelRatio);
    }
  }

  render(): void {
    if (!this.renderer) {
      console.warn('[SceneManager] render() called but renderer not initialized');
      return;
    }
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
