import { $ } from '../../outils/dollar.js';
import { zoom } from '../zoom/zoom.js';
import { makeView } from './make-view.js';

/** La projection de la carte affichée, en pixels CSS du canvas (toucher, menu, repères). */
export function mapView() {
  const r = $('map').getBoundingClientRect();
  return makeView(r.width, r.height, zoom.z, zoom.x, zoom.y, zoom.t);
}
