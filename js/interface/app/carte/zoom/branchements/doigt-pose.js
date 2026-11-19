import { $ } from '../../../outils/dollar.js';
import { gesture } from '../gesture.js';
import { grabFleet } from '../grab-fleet.js';
import { toCells } from '../to-cells.js';

$('map').addEventListener('pointerdown', (e) => {
  if (!gesture.pts.size) gesture.moved = false;
  gesture.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  gesture.start = null;
  gesture.two = null; // un doigt de plus : le geste à deux doigts se décide de nouveau
  // Un deuxième doigt : c'est un pincement, plus une visée.
  const id = gesture.pts.size === 1 && (e.pointerType !== 'mouse' || e.button === 0) ? grabFleet(toCells(e.clientX, e.clientY)) : null;
  gesture.aim = id ? { id, at: null, started: false } : null;
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {}
});
