import { render } from '../dessin/render.js';
import { etat } from '../etat.js';
import { play } from './play.js';

/** On lâche : la lecture reprend si elle tournait, d'ici (sauf au bout de la partie). */
export function release() {
  if (!etat.resume) return;
  etat.resume = false;
  if (etat.t < etat.film.end) play();
  else render();
}
