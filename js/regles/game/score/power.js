import { RACES } from '../races/races.js';

/** Puissance : un humain vaut 1, un psionique 120 (plus de cent humains réunis). */
export function power(race, pop) {
  const R = RACES[race];
  return R ? Math.floor(pop * R.power) : 0;
}
