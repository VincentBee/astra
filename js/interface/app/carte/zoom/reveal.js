import { UNIVERSE } from '../../../../regles/game/index.js';
import { clampZoom } from './clamp-zoom.js';
import { zoom } from './zoom.js';

/** Si la case (x, y) est hors de la vue, la vue s'y centre (flotte choisie dans la grille). */
export function reveal(x, y) {
  if (zoom.z <= 1) return;
  const span = UNIVERSE.w / zoom.z;
  if (x + 0.5 >= zoom.x && x + 0.5 <= zoom.x + span && y + 0.5 >= zoom.y && y + 0.5 <= zoom.y + span) return;
  zoom.x = x + 0.5 - span / 2;
  zoom.y = y + 0.5 - span / 2;
  clampZoom();
}
