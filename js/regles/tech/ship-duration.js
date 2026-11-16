import { TEMPO } from './tempo.js';
import { SHIPS } from './ships.js';

/** Durée de construction d'un lot de vaisseaux, en ms : plus courte avec un chantier plus grand. */
export function shipDuration(race, type, count, yardLevel) {
  const c = SHIPS[race][type].cost;
  const total = Object.values(c).reduce((a, b) => a + b, 0) * count;
  return Math.round((Math.max(6, Math.round(total / (30 * (1 + 0.5 * Math.max(0, yardLevel - 1))))) * 1000) / TEMPO);
}
