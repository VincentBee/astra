import { mapView } from '../relief/map-view.js';
import { clampZoom } from './clamp-zoom.js';
import { zoom } from './zoom.js';

/** Glisse la vue pour que le point du plan du jeu sous (x0, y0) passe sous (x1, y1), en pixels CSS du canvas. */
export function panBy(x0, y0, x1, y1) {
  const view = mapView();
  const a = view.unproj(x0, y0);
  const b = view.unproj(x1, y1);
  zoom.x -= b.u - a.u;
  zoom.y -= b.v - a.v;
  clampZoom();
}
