import { TECHS } from './techs.js';

/** Coût du niveau suivant d'une technologie (de `level` à `level` + 1). */
export function techCost(race, key, level) {
  const t = TECHS[race][key];
  const m = Math.pow(1.7, level);
  const out = {};
  for (const [r, v] of Object.entries(t.base)) out[r] = Math.floor(v * m);
  return out;
}
