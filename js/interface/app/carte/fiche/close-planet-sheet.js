import { etat } from '../../etat.js';
import { renderPick } from './render-pick.js';

/** Ferme la fiche de la planète : bouton Fermer, ou toucher le fond sombre autour. */
export function closePlanetSheet() {
  etat.selected = null;
  renderPick();
}
