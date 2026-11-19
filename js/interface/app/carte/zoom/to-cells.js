import { $ } from '../../outils/dollar.js';
import { mapView } from '../relief/map-view.js';

// Doigts et souris : un doigt glisse la vue (si elle est zoomée), deux doigts pincent.
// Un geste qui a bougé n'est pas un toucher : le clic qui suit est ignoré.
// Appuyer sur une de mes flottes puis glisser la traîne vers sa cible (D-126) : on lâche, elle part.
/**
 * Point (clientX, clientY) en cases : le centre d'une case tombe sur ses coordonnées entières.
 * La carte est un bassin vu en perspective (D-559) : le point est ramené sur le plan du jeu.
 */
export function toCells(clientX, clientY) {
  const r = $('map').getBoundingClientRect();
  const w = mapView().unproj(clientX - r.left, clientY - r.top);
  return { x: w.u - 0.5, y: w.v - 0.5 };
}
