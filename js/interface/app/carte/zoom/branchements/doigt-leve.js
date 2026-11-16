import { $ } from '../../../outils/dollar.js';
import { dropFleet } from '../../selection/drop-fleet.js';
import { gesture } from '../gesture.js';
import { toCells } from '../to-cells.js';

$('map').addEventListener('pointerup', (e) => {
  gesture.pts.delete(e.pointerId);
  const aim = gesture.aim;
  if (gesture.pts.size) return;
  gesture.aim = null;
  if (aim?.started) dropFleet(aim.id, toCells(e.clientX, e.clientY));
});
