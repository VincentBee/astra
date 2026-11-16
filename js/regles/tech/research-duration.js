import { TEMPO } from './tempo.js';

/** Durée de recherche en ms : plus courte avec un labo plus grand. */
export function researchDuration(cost, labLevel) {
  const total = Object.values(cost).reduce((a, b) => a + b, 0);
  return Math.round((Math.max(8, Math.round(total / (20 * (1 + 0.5 * Math.max(0, labLevel - 1))))) * 1000) / TEMPO);
}
