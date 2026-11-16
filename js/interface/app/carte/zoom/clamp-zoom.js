import { UNIVERSE } from '../../../../regles/game/index.js';
import { $ } from '../../outils/dollar.js';
import { ZOOM_MAX } from './zoom-max.js';
import { zoom } from './zoom.js';

/** Garde la vue dans l'univers. */
export function clampZoom() {
  zoom.z = Math.min(ZOOM_MAX, Math.max(1, zoom.z));
  const span = UNIVERSE.w / zoom.z;
  zoom.x = Math.min(UNIVERSE.w - span, Math.max(0, zoom.x));
  zoom.y = Math.min(UNIVERSE.h - span, Math.max(0, zoom.y));
  $('btn-zoom-in').disabled = zoom.z >= ZOOM_MAX - 1e-6;
  $('btn-zoom-out').disabled = zoom.z <= 1 + 1e-6;
  $('btn-zoom-fit').hidden = zoom.z <= 1 + 1e-6;
}
