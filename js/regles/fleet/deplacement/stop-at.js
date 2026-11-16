import { fleetPos } from './fleet-pos.js';
import { moveTo } from './move-to.js';

/** Arrêt : la flotte finit sa course sur la case la plus proche, et y attend. */
export function stopAt(f, race, tech, now) {
  const pos = fleetPos(f, now);
  return moveTo(f, race, tech, { x: Math.round(pos.x), y: Math.round(pos.y) }, null, now);
}
