import { mapView } from '../relief/map-view.js';
import { clampZoom } from './clamp-zoom.js';
import { ZOOM_MAX } from './zoom-max.js';
import { zoom } from './zoom.js';

/** Zoome d'un facteur `k` en gardant fixe le point (sx, sy) du canvas, en pixels CSS. */
export function zoomAt(k, sx, sy) {
  const before = mapView().unproj(sx, sy);
  zoom.z = Math.min(ZOOM_MAX, Math.max(1, zoom.z * k));
  // La projection ne dépend que de la case moins le coin de la vue : on décale le coin.
  const after = mapView().unproj(sx, sy);
  zoom.x += before.u - after.u;
  zoom.y += before.v - after.v;
  clampZoom();
}
