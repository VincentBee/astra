import { TEMPO } from '../../../tech.js';

/** Durée de construction en ms (accélérée). */
export function buildDuration(race, levels, cost) {
  return Math.round((Math.max(4, Math.round((cost.minerals + cost.energy) / 25)) * 1000) / TEMPO);
}
