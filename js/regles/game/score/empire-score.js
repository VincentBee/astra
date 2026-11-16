import { TECHS, techCost, SHIPS } from '../../tech/index.js';
import { RACES } from '../races/races.js';
import { score } from './score.js';

/**
 * Points d'un empire : les bâtiments de toutes ses planètes (hors entrepôts),
 * ses recherches et ses vaisseaux, posés ou en vol (prix / 100). Ils
 * départagent les joueurs que le froid prend en même temps.
 */
export function empireScore(race, planets, fleets = []) {
  if (!RACES[race]) return 0;
  let total = 0;
  const tech = planets[0]?.tech || {};
  for (const [k, n] of Object.entries(tech)) {
    if (!Object.hasOwn(TECHS[race], k)) continue;
    for (let l = 0; l < (Number(n) || 0); l++) for (const v of Object.values(techCost(race, k, l))) total += v;
  }
  const ships = (list) => {
    for (const [t, n] of Object.entries(list || {})) {
      if (!Object.hasOwn(SHIPS[race], t)) continue;
      for (const v of Object.values(SHIPS[race][t].cost)) total += v * Math.max(0, Number(n) || 0);
    }
  };
  for (const pl of planets) ships(pl.ships);
  for (const f of fleets) ships(f.ships);
  return Math.floor(total / 100) + planets.reduce((t, pl) => t + score(race, pl.levels || {}), 0);
}
