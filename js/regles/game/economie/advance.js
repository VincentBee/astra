import { SPEED } from '../temps/speed.js';
import { RES } from '../ressources/res.js';
import { SOIL } from '../ressources/soil.js';
import { RACES } from '../races/races.js';
import { num } from '../outils/num.js';
import { flows } from './flows.js';
import { capOf } from './cap-of.js';

/** Un pas de `ms` millisecondes réelles. */
export function advance(race, s, ms, boost) {
  const h = (Math.max(0, ms) / 3_600_000) * SPEED;
  if (h <= 0) return s;
  const f = flows(race, s.levels, s.pop, s.stock, h, boost, s.nature, s.reserve, s.tech, s.climate);
  const stock = {};
  const lost = {}; // ce qui ne rentre pas dans l'entrepôt plein
  for (const r of RES) {
    const cap = capOf(r, f);
    const cur = num(s.stock[r]); // #76 : une clé absente ne rend pas le stock NaN
    const v = cur + f.net[r] * h;
    // Un entrepôt déjà plein ne déborde pas, mais n'est pas vidé non plus.
    stock[r] = Math.max(0, f.net[r] > 0 ? Math.max(cur, Math.min(cap, v)) : v);
    lost[r] = Math.max(0, v - stock[r]);
  }
  const R = RACES[race];
  let pop = s.pop;
  if (R.pop) pop = Math.max(R.pop.min, R.grow(s.pop, f.popCap, f.effF, f.effE, h));
  // Le sol se vide de ce qu'on extrait et se remplit de ce qu'il produit, jusqu'à son maximum.
  let reserve = s.reserve;
  if (s.nature && reserve) {
    reserve = { ...reserve };
    for (const k of SOIL) {
      const n = s.nature[k];
      // On ne puise que ce qui entre dans l'entrepôt : le reste reste dans le sol.
      const taken = Math.max(0, f.soil[k].got * h - lost[k]);
      if (n) reserve[k] = Math.min(n.max, Math.max(0, reserve[k] + n.regen * h - taken));
    }
  }
  return { ...s, stock, pop, reserve };
}
