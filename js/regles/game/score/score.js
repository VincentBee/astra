import { RACES } from '../races/races.js';
import { upgradeCost } from '../construction/upgrade-cost.js';

/** Score : ressources investies dans les bâtiments. */
export function score(race, levels) {
  const R = RACES[race];
  if (!R) return 0;
  let total = 0;
  for (const k of Object.keys(R.buildings)) {
    if (k === 'store') continue; // empiler des entrepôts ne rend pas plus fort : il ne compte pas
    for (let l = 0; l < (levels[k] || 0); l++) {
      const c = upgradeCost(race, k, l);
      total += c.minerals + c.energy;
    }
  }
  return Math.floor(total / 100);
}
