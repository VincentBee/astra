import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { closeMenu } from '../../menu/close-menu.js';
import { selectFleet } from '../../selection/select-fleet.js';
import { gesture } from '../gesture.js';
import { reliefOn } from '../../relief/relief-on.js';
import { panBy } from '../pan-by.js';
import { setTilt } from '../set-tilt.js';
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
    panBy(p.x - r.left, p.y - r.top, e.clientX - r.left, e.clientY - r.top);
  } else if (pts.length === 2) {
    gesture.moved = true;
    gesture.aim = null;
    closeMenu();
    const other = pts.find((q) => q !== p);
    const before = Math.hypot(p.x - other.x, p.y - other.y);
    const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    // Carte en 3D : deux doigts côte à côte qui montent ou descendent ensemble inclinent la vue (D-562).
    if (!gesture.two) {
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (Math.hypot(dx, dy) < 6) return; // pas encore assez bougé pour décider (le point n'est pas mis à jour)
      const side = Math.abs(p.y - other.y) < 0.6 * Math.abs(p.x - other.x);
      gesture.two = reliefOn() && side && Math.abs(dy) > 2 * Math.abs(dx) && Math.abs(after - before) < 0.5 * Math.abs(dy) ? 'tilt' : 'pinch';
    }
    if (gesture.two === 'tilt') {
      setTilt(zoom.t - (e.clientY - p.y) / 300); // vers le haut : plus penchée
      gesture.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }
    // Le point entre les deux doigts suit les doigts ; l'écart des doigts donne le zoom.
    const mx0 = (p.x + other.x) / 2 - r.left;
    const my0 = (p.y + other.y) / 2 - r.top;
    const mx1 = (e.clientX + other.x) / 2 - r.left;
    const my1 = (e.clientY + other.y) / 2 - r.top;
    if (before > 0) zoomAt(after / before, mx0, my0);
    panBy(mx0, my0, mx1, my1);
  }
  gesture.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
