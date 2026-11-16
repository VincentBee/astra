import { distance } from '../../game/index.js';
import { TEMPO } from '../../tech/index.js';
import { MIN_TRIP } from './min-trip.js';

/** Durée du trajet en ms, à la vitesse de la flotte. */
export function tripMs(from, to, speed) {
  const d = distance(from, to);
  if (!d) return 0;
  if (!speed) return Infinity;
  return Math.max(MIN_TRIP, Math.round(((d / speed) * 60_000) / TEMPO));
}
