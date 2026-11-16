import { techCost } from '../../../tech.js';
import { planLane } from './plan-lane.js';
import { planAhead } from './plan-ahead.js';
import { shipsCost } from './ships-cost.js';
import { planNeed } from './plan-need.js';
import { NO_INCOME } from './no-income.js';
import { starved } from './starved.js';
import { stateAt } from '../economie/state-at.js';
import { planName } from './plan-name.js';
import { settle } from '../economie/settle.js';
import { upgradeCost } from '../construction/upgrade-cost.js';

/**
 * Estimation du fil, pour l'affichage seulement : quand chaque élément du fil
 * devrait commencer et finir, si la production reste celle d'aujourd'hui
 * (ce qui est déjà lancé compris). Deux passes : 10 min à la seconde près,
 * puis 6 h, plus grossière. Renvoie, dans l'ordre du fil,
 * [{ item, lane, key, level, count, cost, start, end, why }] : `key` est le
 * bâtiment, la technologie ou le vaisseau ; `level` le niveau visé (bâtiment,
 * recherche) ; `count` le nombre de vaisseaux. `start` vaut null si rien
 * n'arrive dans les 6 h, et `why` dit ce qui bloque quand on le sait.
 */
export function planForecast(planet, now) {
  // Ce qui s'est déjà lancé avant `now` (pas encore écrit dans la fiche) ne compte plus.
  const here = JSON.parse(JSON.stringify(planet));
  settle(here, now);
  const s = stateAt(here, now);
  if (!s.plan.length) return [];
  const passes = [10 * 60_000, 6 * 3_600_000].map((h) => stateAt(here, now + h).done.filter((d) => d.kind === 'start'));
  // Niveaux, prix et places tels qu'au lancement de chaque élément, si tout passe dans l'ordre.
  const ahead = planAhead({ ...s, plan: [] });
  const race = planet.race;
  // Chantier bloqué par un élément qui ne peut pas partir (prérequis, place, entrepôt) : ceux de
  // son chantier qui le suivent l'attendent, et le disent (#50, D-440).
  const stuck = {};
  return s.plan.map((item, i) => {
    const lane = planLane(item);
    const hit = passes.map((p) => p.find((d) => d.i === i)).find(Boolean) || null;
    const st = { levels: ahead.levels, tech: ahead.tech };
    const need = planNeed(race, planet.places, st, item);
    // Pas de prérequis manquant : peut-être une ressource qui ne rentre plus (D-270).
    const dry = need.why ? null : starved(need.cost, s.stock, () => s.prod);
    let out;
    if (typeof item === 'string') {
      out = { key: item, level: (ahead.levels[item] || 0) + 1, cost: upgradeCost(race, item, ahead.levels[item] || 0) };
      ahead.levels[item] = out.level;
    } else if (item.tech) {
      out = { key: item.tech, level: (ahead.tech[item.tech] || 0) + 1, cost: techCost(race, item.tech, ahead.tech[item.tech] || 0) };
      ahead.tech[item.tech] = out.level;
    } else out = { key: item.ship, count: item.n, cost: shipsCost(race, item.ship, item.n) };
    let why = null;
    if (!hit) {
      // Sa propre raison d'abord (« Plus de place »…), sinon l'élément qui bloque son chantier.
      why = need.why || (stuck[lane] && `Attend ${stuck[lane]}`) || (dry && NO_INCOME[dry]) || null;
      if (need.why && !stuck[lane]) stuck[lane] = planName(race, item, out);
    }
    return { item, lane, ...out, start: hit?.start ?? null, end: hit?.end ?? null, why };
  });
}
