import { POWERS } from './powers.js';

export function powerCost(planet, key, pop = planet.pop) {
  return POWERS[key].cost(pop);
}
