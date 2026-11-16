import { render } from '../dessin/render.js';
import { etat } from '../etat.js';
import { step } from './step.js';

export function play() {
  if (etat.t >= etat.film.end) etat.t = etat.film.start;
  etat.playing = true;
  etat.last = performance.now();
  cancelAnimationFrame(etat.raf);
  etat.raf = requestAnimationFrame(step);
  render();
}
