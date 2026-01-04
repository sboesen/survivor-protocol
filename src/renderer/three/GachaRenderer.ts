import * as THREE from 'three';
import type { CameraController } from './CameraController';
import type { SpriteManager } from './SpriteManager';

export interface GachaConfig {
  scene: THREE.Scene;
  cameraController: CameraController;
  spriteManager: SpriteManager;
}

export class GachaRenderer {
  private scene: THREE.Scene;
  private spriteManager: SpriteManager;

  // Gacha animation state
  private gachaGroup: THREE.Group | null = null;
  private cards: Map<string, THREE.Group> = new Map();
  private animationFrame = 0;
  private isAnimating = false;

  constructor(config: GachaConfig) {
    this.scene = config.scene;
    this.spriteManager = config.spriteManager;
  }

  init(): void {
    // Create gacha group for overlay rendering
    this.gachaGroup = new THREE.Group();
    this.gachaGroup.position.z = 1000;
    this.scene.add(this.gachaGroup);
  }

  showGacha(): void {
    if (!this.gachaGroup) return;
    this.isAnimating = true;
    this.animationFrame = 0;
    this.gachaGroup.visible = true;

    // Create card reveal animation elements
    this.createCardReveal();
  }

  hideGacha(): void {
    if (!this.gachaGroup) return;
    this.isAnimating = false;
    this.gachaGroup.visible = false;

    // Clear cards
    this.clearCards();
  }

  update(): void {
    if (!this.isAnimating || !this.gachaGroup) return;

    this.animationFrame++;

    // Animate card reveal
    if (this.animationFrame < 60) {
      // Spin phase
      const spinProgress = this.animationFrame / 60;
      this.gachaGroup.rotation.z = spinProgress * Math.PI * 4;
    } else if (this.animationFrame < 120) {
      // Reveal phase
      const revealProgress = (this.animationFrame - 60) / 60;
      this.gachaGroup.rotation.z = Math.PI * 2 * (1 - revealProgress);
    } else {
      // Animation complete
      this.gachaGroup.rotation.z = 0;
    }
  }

  revealCharacter(charId: string): void {
    if (!this.gachaGroup) return;

    // Clear previous cards
    this.clearCards();

    // Create character card
    const card = this.createCharacterCard(charId);
    this.cards.set(charId, card);
    this.gachaGroup.add(card);

    // Show card with animation
    card.scale.set(0.1, 0.1, 1);
    this.animateCardScale(card, 1);
  }

  private createCardReveal(): void {
    if (!this.gachaGroup) return;

    // Create mystery card placeholder
    const cardGroup = new THREE.Group();

    // Card back
    const cardGeometry = new THREE.PlaneGeometry(160, 200);
    const cardMaterial = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const card = new THREE.Mesh(cardGeometry, cardMaterial);
    card.position.z = 0;
    cardGroup.add(card);

    // Card border
    const borderGeometry = new THREE.PlaneGeometry(170, 210);
    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x6366f1, side: THREE.DoubleSide });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.z = -0.1;
    cardGroup.add(border);

    // Question mark
    const sprite = this.spriteManager.getSprite('?', 100);
    sprite.position.set(0, 0, 1);
    cardGroup.add(sprite);

    cardGroup.position.set(0, 0, 50);
    this.gachaGroup.add(cardGroup);
  }

  private createCharacterCard(charId: string): THREE.Group {
    const cardGroup = new THREE.Group();

    // Card background
    const cardGeometry = new THREE.PlaneGeometry(160, 200);
    const cardMaterial = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const card = new THREE.Mesh(cardGeometry, cardMaterial);
    card.position.z = 0;
    cardGroup.add(card);

    // Card border
    const borderGeometry = new THREE.PlaneGeometry(170, 210);
    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x6366f1, side: THREE.DoubleSide });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.z = -0.1;
    cardGroup.add(border);

    // Character sprite
    const sprite = this.spriteManager.getSpriteWithShadow(charId, 80);
    sprite.position.set(0, 20, 1);
    cardGroup.add(sprite);

    // Glow effect
    const glowGeometry = new THREE.PlaneGeometry(180, 220);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -0.2;
    cardGroup.add(glow);

    return cardGroup;
  }

  private animateCardScale(card: THREE.Group, targetScale: number): void {
    let currentScale = 0.1;
    const animate = () => {
      currentScale += (targetScale - currentScale) * 0.1;
      card.scale.set(currentScale, currentScale, 1);

      if (Math.abs(targetScale - currentScale) > 0.001) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  private clearCards(): void {
    this.cards.forEach((card) => {
      if (card.parent) {
        card.parent.remove(card);
      }
    });
    this.cards.clear();

    // Clear gacha group children except root group
    if (this.gachaGroup) {
      while (this.gachaGroup.children.length > 0) {
        const child = this.gachaGroup.children[0];
        this.gachaGroup.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      }
    }
  }

  dispose(): void {
    this.hideGacha();

    if (this.gachaGroup) {
      this.scene.remove(this.gachaGroup);
      this.gachaGroup = null;
    }
  }
}
