import { SOIL } from '../ressources/soil.js';
import { freeCell } from './free-cell.js';
import { PLANET_COUNT } from './planet-count.js';
import { PLANET_PLACES } from './planet-places.js';
import { SMALL_BODIES } from './small-bodies.js';
import { PLANET_NAMES } from './planet-names.js';
import { seeded } from '../outils/seeded.js';
import { NATURE } from '../ressources/nature.js';
import { sunFor } from '../climat/sun-for.js';
import { inSun } from '../climat/in-sun.js';
import { climateAt } from '../climat/climate-at.js';
import { pick } from '../outils/pick.js';
import { between } from '../outils/between.js';

/**
 * Planètes de la partie `gid` : [{ id, name, x, y, nature, reserve }], les
 * mêmes sur tous les téléphones. Elles naissent pleines.
 */
export function planetsFor(gid) {
  const random = seeded(gid);
  // Mélange de Fisher-Yates : un nombre fixe de tirages, partout pareil (un
  // tri au comparateur aléatoire dépend du moteur JavaScript du téléphone).
  const names = PLANET_NAMES.slice();
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  const out = [];
  for (let i = 0; i < PLANET_COUNT; i++) {
    const c = freeCell(out, random, 3);
    const nature = {};
    for (const k of SOIL) nature[k] = { max: between(random, NATURE[k].max, 100), regen: between(random, NATURE[k].regen, 5) };
    const reserve = Object.fromEntries(SOIL.map((k) => [k, nature[k].max]));
    out.push({ id: `p${i}`, name: names[i % names.length], x: c.x, y: c.y, nature, reserve });
  }
  // Une planète tirée dans le soleil est replacée ensuite, avec un hasard à
  // part : les autres restent où elles étaient avant le soleil, ce qui garde
  // les parties déjà commencées.
  const sun = sunFor(gid);
  const elsewhere = seeded(`${gid}/hors-soleil`);
  for (const w of out) {
    if (!inSun(sun, w)) continue;
    const c = freeCell(out.filter((x) => x !== w), elsewhere, 3, (x) => !inSun(sun, x));
    w.x = c.x;
    w.y = c.y;
  }
  // Places et petits corps : tirés avec leur propre hasard, ajoutés après les
  // planètes, pour que celles-ci restent où elles étaient dans les parties déjà commencées.
  const sizes = seeded(`${gid}/taille`);
  for (const w of out) Object.assign(w, { kind: 'planet', places: pick(sizes, PLANET_PLACES) });
  const small = seeded(`${gid}/petits-corps`);
  for (const [kind, b] of Object.entries(SMALL_BODIES)) {
    const names = b.names.slice();
    for (let i = 0; i < b.count; i++) {
      const c = freeCell(out, small, 2, (x) => !inSun(sun, x));
      const nature = {};
      for (const k of SOIL) {
        const max = Math.max(100, Math.round((between(small, NATURE[k].max) * b.share[k]) / 100) * 100);
        nature[k] = { max, regen: Math.max(1, Math.round(between(small, NATURE[k].regen) * b.share[k])) };
      }
      const name = names.splice(Math.floor(small() * names.length), 1)[0] || `${b.label} ${i + 1}`;
      const reserve = Object.fromEntries(SOIL.map((k) => [k, nature[k].max]));
      out.push({ id: `${kind[0]}${i}`, name, x: c.x, y: c.y, nature, reserve, kind, places: pick(small, b.places) });
    }
  }
  for (const w of out) w.climate = climateAt(sun, w);
  return out;
}
