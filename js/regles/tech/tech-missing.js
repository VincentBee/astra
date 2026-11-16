import { TECHS } from './techs.js';
import { lvOf } from './lv-of.js';

/** Ce qui manque pour rechercher une technologie, en clair, ou null si rien. */
export function techMissing(race, key, tech, labLevel) {
  if (!Object.hasOwn(TECHS[race] || {}, key)) return 'technologie inconnue';
  const t = TECHS[race][key];
  const miss = [];
  for (const [k, need] of Object.entries(t.req)) {
    if (k === 'lab') {
      if (labLevel < need) miss.push(`labo niv. ${need}`);
    } else if (lvOf(tech, k) < need) miss.push(`${TECHS[race][k].name} ${need}`);
  }
  return miss.length ? miss.join(', ') : null;
}
