import { $ } from '../../outils/dollar.js';
import { cellCss } from './cell-css.js';
import { zoom } from './zoom.js';

// Doigts et souris : un doigt glisse la vue (si elle est zoomée), deux doigts pincent.
// Un geste qui a bougé n'est pas un toucher : le clic qui suit est ignoré.
// Appuyer sur une de mes flottes puis glisser la traîne vers sa cible (D-126) : on lâche, elle part.
/** Point (clientX, clientY) en cases : le centre d'une case tombe sur ses coordonnées entières. */
export function toCells(clientX, clientY) {
  const r = $('map').getBoundingClientRect();
  const size = cellCss();
  return { x: zoom.x + (clientX - r.left) / size - 0.5, y: zoom.y + (clientY - r.top) / size - 0.5 };
}
