import { flows } from './flows.js';
import { simulate } from './simulate.js';
import { planItem } from '../plan/plan-item.js';
import { planNext } from '../plan/plan-next.js';
import { until } from './until.js';
import { AUTO_MAX } from '../plan/auto-max.js';
import { autoRule } from '../plan/auto-rule.js';

/**
 * État d'une planète à l'instant `now`, sans la modifier.
 * Trois files d'attente peuvent finir entre-temps, chacune à son heure : le
 * chantier (bâtiment), la recherche (technologie) et le chantier naval (lot
 * de vaisseaux). On calcule l'économie jusqu'à chaque fin, on applique son
 * effet, puis on continue : un bâtiment ou une technologie terminés
 * changent la production à partir de cet instant-là.
 *
 * Fil de construction (`plan`, D-105) : chantier libre, le premier bâtiment
 * du fil se lance tout seul dès que le stock couvre son prix (et qu'il reste
 * une place). Même calcul pour tous : chez le propriétaire, au rattrapage
 * après une absence, et pour les estimations (voir planForecast).
 */
export function stateAt(planet, now, autoMax = AUTO_MAX) {
  const race = planet.race;
  let s = {
    stock: planet.stock,
    pop: planet.pop || 0,
    levels: planet.levels,
    nature: planet.nature,
    climate: planet.climate,
    reserve: planet.reserve,
    tech: planet.tech || {},
    ships: planet.ships || {},
  };
  let at = planet.at;
  const q = { queue: planet.queue || null, research: planet.research || null, yard: planet.yard || null };
  // Le fil, avec la place de chaque élément dans le fil de départ (pour planForecast).
  const plan = (Array.isArray(planet.plan) ? planet.plan : []).map((item, i) => ({ item: planItem(race, item), i })).filter((x) => x.item);
  const auto = autoRule(race, planet.auto);
  let autoLeft = autoMax;
  let autoFull = null; // heure du dernier lot que la règle a pu lancer, si elle a atteint autoMax
  const done = [];
  for (;;) {
    const next = Object.entries(q)
      .filter(([, v]) => v && v.end <= now)
      .sort((x, y) => x[1].end - y[1].end || (x[0] < y[0] ? -1 : 1))[0];
    // Un chantier libre : le fil attend que le stock couvre le prix, au plus jusqu'au prochain événement.
    const picks = planNext(race, planet.places, s, q, plan, autoLeft > 0 ? auto : null);
    if (picks) {
      const limit = next ? Math.max(at, next[1].end) : now;
      const r = until(race, s, at, limit, picks.map((p) => p.cost), planet.trance || 0);
      s = r.s;
      at = Math.max(at, r.at);
      if (r.ok) {
        const pick = picks[r.k];
        const stock = { ...s.stock };
        for (const [k, v] of Object.entries(pick.cost)) stock[k] -= v;
        s = { ...s, stock };
        if (pick.auto) {
          // La règle ne quitte pas la planète : elle relancera un lot au prochain chantier libre.
          q.yard = { ...pick.job(at), auto: true };
          if (--autoLeft === 0) autoFull = at;
          done.push({ kind: 'start', lane: 'yard', auto: true, ...q.yard });
          continue;
        }
        q[pick.lane] = pick.job(at);
        const [{ i }] = plan.splice(pick.pos, 1);
        done.push({ kind: 'start', lane: pick.lane, i, ...q[pick.lane] });
        continue;
      }
    }
    if (!next) break;
    const [kind, job] = next;
    s = simulate(race, s, at, job.end, planet.trance);
    at = Math.max(at, job.end); // un ordre daté d'avant (vieille fiche) ne fait pas recompter
    if (kind === 'queue') s = { ...s, levels: { ...s.levels, [job.key]: job.level } };
    else if (kind === 'research') s = { ...s, tech: { ...s.tech, [job.key]: job.level } };
    else s = { ...s, ships: { ...s.ships, [job.type]: (s.ships[job.type] || 0) + job.count } };
    done.push({ kind, ...job });
    q[kind] = null;
  }
  s = simulate(race, s, at, now, planet.trance);
  // Rythme actuel, pour l'affichage (sur une seconde de jeu).
  const prod = flows(race, s.levels, s.pop, s.stock, 1 / 3600, (planet.trance || 0) > now ? 2 : 1, s.nature, s.reserve, s.tech, s.climate);
  return { stock: s.stock, pop: s.pop, levels: s.levels, reserve: s.reserve, tech: s.tech, ships: s.ships, ...q, plan: plan.map((x) => x.item), auto, autoFull, done, prod };
}
