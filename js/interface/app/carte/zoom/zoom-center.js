import { $ } from '../../outils/dollar.js';
import { zoomAt } from './zoom-at.js';

/** Zoom par les boutons : autour du centre de la vue. */
export function zoomCenter(k) {
  const r = $('map').getBoundingClientRect();
  zoomAt(k, r.width / 2, r.height / 2);
}
