export interface DamageTextEntry {
  el: HTMLElement;
  wx: number;
  wy: number;
  life: number;
}

export class DamageTextSystem {
  private getDamageLayer(): HTMLElement | null {
    return document.getElementById('damage-layer');
  }

  spawnDamageText(
    _wx: number,
    _wy: number,
    txt: string | number,
    color = '#fff',
    isCrit = false
  ): HTMLElement | null {
    const el = document.createElement('div');
    el.className = 'dmg-text ' + (isCrit ? 'crit-text' : '');
    if (color === '#f00') el.classList.add('player-hit');
    el.textContent = txt.toString() + (isCrit ? '!' : '');
    el.style.color = color;

    const layer = this.getDamageLayer();
    if (layer) {
      layer.appendChild(el);
      return el;
    }

    return null;
  }

  updateDamageTexts(
    texts: DamageTextEntry[],
    px: number,
    py: number
  ): void {
    texts.forEach(t => {
      t.life--;
      t.el.style.opacity = (t.life / 20).toString();

      let rx = t.wx - px;
      let ry = t.wy - py;

      const worldSize = 2000;
      if (rx < -worldSize / 2) rx += worldSize;
      if (rx > worldSize / 2) rx -= worldSize;
      if (ry < -worldSize / 2) ry += worldSize;
      if (ry > worldSize / 2) ry -= worldSize;

      const scale = t.el.classList.contains('crit-text') ? 1.5 : 1;
      t.el.style.transform = `translate(${rx + window.innerWidth / 2}px, ${ry + window.innerHeight / 2 - (80 - t.life)}px) scale(${scale})`;
    });
  }
}
