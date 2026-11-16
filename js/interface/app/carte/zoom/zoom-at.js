import { cellCss } from './cell-css.js';
import { clampZoom } from './clamp-zoom.js';
import { ZOOM_MAX } from './zoom-max.js';
import { zoom } from './zoom.js';

/** Zoome d'un facteur `k` en gardant fixe le point (sx, sy) du canvas, en pixels CSS. */
export function zoomAt(k, sx, sy) {
  const c = cellCss();
  const wx = zoom.x + sx / c;
  const wy = zoom.y + sy / c;
  zoom.z = Math.min(ZOOM_MAX, Math.max(1, zoom.z * k));
  const c2 = cellCss();
  zoom.x = wx - sx / c2;
  zoom.y = wy - sy / c2;
  clampZoom();
}
