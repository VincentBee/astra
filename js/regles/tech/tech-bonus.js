import { TECHS } from './techs.js';
import { lvOf } from './lv-of.js';

/** Multiplicateurs (1 = sans effet) donnés par les technologies d'un joueur. */
export function techBonus(race, tech) {
  const out = { minerals: 1, food: 1, energy: 1, speed: 1, attack: 1, hull: 1 };
  for (const [k, t] of Object.entries(TECHS[race] || {})) {
    for (const [b, v] of Object.entries(t.bonus || {})) out[b] += v * lvOf(tech, k);
  }
  return out;
}
