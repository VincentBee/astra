import { RACES } from '../../../../regles/game/index.js';
import { fill } from './fill.js';

/** Une jauge par ressource de la race, puis les habitants (plafond : les logements), s'il y en a. */
export function stockFill(race, s) {
  const R = RACES[race];
  const out = R.resources.map((res) => ({ res, k: fill(s.stock[res] || 0, s.prod.caps[res]) }));
  if (R.pop) out.push({ res: 'pop', k: fill(s.pop, s.prod.popCap) });
  return out;
}
