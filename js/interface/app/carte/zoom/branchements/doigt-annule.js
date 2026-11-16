import { $ } from '../../../outils/dollar.js';
import { gesture } from '../gesture.js';

$('map').addEventListener('pointercancel', (e) => {
  gesture.pts.delete(e.pointerId);
  if (!gesture.pts.size) gesture.aim = null;
});
