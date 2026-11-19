import { mapView } from '../relief/map-view.js';
import { zoom } from './zoom.js';

/**
 * Taille d'une case à l'écran, en pixels CSS, zoom compris. La carte est en perspective (D-559) :
 * la taille dépend de l'endroit. `at` : une case ({ x, y }) ; sans, le centre de la vue.
 */
export function cellCss(at = null) {
  const view = mapView();
  const span = view.V;
  const u = at ? at.x + 0.5 : zoom.x + span / 2;
  const v = at ? at.y + 0.5 : zoom.y + span / 2;
  return view.pt(u, v, 0).s;
}
