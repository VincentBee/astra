import { $ } from '../../outils/dollar.js';
import { zoom } from '../zoom/zoom.js';
import { flatView } from './flat-view.js';
import { reliefOn } from './relief-on.js';

/**
 * La projection de la carte affichée, en pixels CSS du canvas (toucher, menu, repères) : plate
 * (carte d'origine), ou en perspective si la carte en 3D est cochée et chargée (D-563).
 */
export function mapView() {
  const r = $('map').getBoundingClientRect();
  const m = reliefOn();
  return m ? m.makeView(r.width, r.height, zoom.z, zoom.x, zoom.y, zoom.t) : flatView(r.width, zoom.z, zoom.x, zoom.y);
}
