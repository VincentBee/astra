import { TECHS, techMissing, techCost, researchDuration, shipUnlocked, shipDuration } from '../../../tech.js';
import { lv } from '../outils/lv.js';
import { capsFor } from '../ressources/caps-for.js';
import { shipsCost } from './ships-cost.js';
import { storeShort } from './store-short.js';
import { freePlaces } from '../planete/free-places.js';
import { upgradeCost } from '../construction/upgrade-cost.js';
import { buildDuration } from '../construction/build-duration.js';

/**
 * Ce qu'un élément du fil coûterait et lancerait sur l'état `s`, ou { why }
 * s'il ne peut pas encore partir (prérequis, place, entrepôt trop petit).
 * `job(at)` : l'ordre en cours qu'il devient, lancé à l'heure `at`.
 */
export function planNeed(race, places, s, item) {
  const caps = capsFor(s.levels);
  const fits = (cost) => Object.entries(cost).every(([r, v]) => v <= (caps[r] ?? Infinity));
  let out;
  if (typeof item === 'string') {
    if (freePlaces(places, s.levels) <= 0) return { why: 'Plus de place' };
    const level = lv(s.levels, item);
    const cost = upgradeCost(race, item, level);
    out = { cost, job: (at) => ({ key: item, level: level + 1, start: at, end: at + buildDuration(race, s.levels, cost) }) };
  } else if (item.tech) {
    const lab = lv(s.levels, 'lab');
    const T = TECHS[race][item.tech];
    const level = s.tech?.[item.tech] || 0;
    if (!lab) return { why: 'Il faut un labo' };
    if (level >= T.max) return { why: 'Niveau maximum' };
    const miss = techMissing(race, item.tech, s.tech, lab);
    if (miss) return { why: `Il faut : ${miss}` };
    const cost = techCost(race, item.tech, level);
    out = { cost, job: (at) => ({ key: item.tech, level: level + 1, start: at, end: at + researchDuration(cost, lab) }) };
  } else {
    const yard = lv(s.levels, 'yard');
    if (!yard) return { why: 'Il faut un chantier naval' };
    if (!shipUnlocked(race, item.ship, s.tech)) return { why: 'Pas encore recherché' };
    const cost = shipsCost(race, item.ship, item.n);
    out = { cost, job: (at) => ({ type: item.ship, count: item.n, start: at, end: at + shipDuration(race, item.ship, item.n, yard) }) };
  }
  return fits(out.cost) ? out : { why: storeShort(race, out.cost) };
}
