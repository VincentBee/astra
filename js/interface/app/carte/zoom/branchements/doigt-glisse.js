import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { closeMenu } from '../../menu/close-menu.js';
import { selectFleet } from '../../selection/select-fleet.js';
import { cellCss } from '../cell-css.js';
import { clampZoom } from '../clamp-zoom.js';
import { gesture } from '../gesture.js';
import { toCells } from '../to-cells.js';
import { zoomAt } from '../zoom-at.js';
import { zoom } from '../zoom.js';

$('map').addEventListener('pointermove', (e) => {
  const p = gesture.pts.get(e.pointerId);
  if (!p) return;
  const r = e.currentTarget.getBoundingClientRect();
  const pts = [...gesture.pts.values()];
  if (pts.length === 1) {
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 8) return; // petit tremblement : c'est encore un toucher
    gesture.moved = true;
    if (gesture.aim) {
      // Visée : la vue ne bouge pas, un trait suit le doigt jusqu'à la cible.
      if (!gesture.aim.started) {
        gesture.aim.started = true;
        if (etat.selFleet !== gesture.aim.id) selectFleet(gesture.aim.id);
        else closeMenu();
      }
      gesture.aim.at = toCells(e.clientX, e.clientY);
      gesture.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }
    closeMenu(); // le menu est posé sur un point de la carte : il ne suit pas la vue
    const c = cellCss();
    zoom.x -= dx / c;
    zoom.y -= dy / c;
    clampZoom();
  } else if (pts.length === 2) {
    gesture.moved = true;
    gesture.aim = null;
    closeMenu();
    const other = pts.find((q) => q !== p);
    const before = Math.hypot(p.x - other.x, p.y - other.y);
    const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    // Le point entre les deux doigts suit les doigts ; l'écart des doigts donne le zoom.
    const mx0 = (p.x + other.x) / 2 - r.left;
    const my0 = (p.y + other.y) / 2 - r.top;
    const mx1 = (e.clientX + other.x) / 2 - r.left;
    const my1 = (e.clientY + other.y) / 2 - r.top;
    if (before > 0) zoomAt(after / before, mx0, my0);
    const c = cellCss();
    zoom.x -= (mx1 - mx0) / c;
    zoom.y -= (my1 - my0) / c;
    clampZoom();
  }
  gesture.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
