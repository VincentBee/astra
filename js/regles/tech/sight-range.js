import { TECHS } from './techs.js';
import { SIGHT } from './sight.js';
import { lvOf } from './lv-of.js';

/** Portée de détection (en cases) autour d'une planète ou d'une flotte, technologies comprises. */
export function sightRange(race, tech, kind) {
  let extra = 0;
  for (const [k, t] of Object.entries(TECHS[race] || {})) extra += (t.range || 0) * lvOf(tech, k);
  return SIGHT[kind] + extra;
}
