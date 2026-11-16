import { render } from '../dessin/render.js';
import { etat } from '../etat.js';

export function seek(time) {
  etat.t = Math.min(etat.film.end, Math.max(etat.film.start, time));
  render();
}
