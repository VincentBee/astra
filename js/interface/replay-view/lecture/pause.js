import { render } from '../dessin/render.js';
import { etat } from '../etat.js';

export function pause() {
  etat.playing = false;
  cancelAnimationFrame(etat.raf);
  render();
}
