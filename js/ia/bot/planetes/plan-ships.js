import { PLAN_MAX, planAhead, startShips } from '../../../regles/game/index.js';
import { SHIPS, shipUnlocked } from '../../../regles/tech/index.js';
import { colonyTargets } from '../colonisation/colony-targets.js';
import { copy } from '../donnees/copy.js';
import { MIN } from '../donnees/min.js';
import { WANT_PLANETS } from '../donnees/want-planets.js';
import { colonyCount } from './colony-count.js';

/**
 * Chantier naval libre : un colonisateur s'il manque des planètes, sinon des vaisseaux de guerre.
 * Fil pas vide, le lot va à sa fin (D-420) : un seul lot au fil à la fois, sans dépasser
 * PLAN_MAX (D-421).
 */
export function planShips(ctx, pl, st) {
  if (ctx.left <= 0 || !(st.levels.yard > 0) || st.yard) return;
  if (st.plan.length && (st.plan.length >= PLAN_MAX || st.plan.some((x) => x?.ship))) return;
  const race = ctx.p.race;
  const tech = st.tech || {};
  const late = ctx.s.frostOf(pl.cell) - ctx.now < 3 * MIN;
  let type = null;
  let count = 0;
  if (!late && shipUnlocked(race, 'colony', tech) && colonyCount(ctx) < WANT_PLANETS && colonyTargets(ctx, pl.cell).length) {
    type = 'colony';
    count = 1;
  } else {
    const war = ['heavy', 'fighter'].filter((k) => shipUnlocked(race, k, tech));
    if (!war.length) return;
    // On garde de quoi construire : on ne dépense que ce qui dépasse une réserve.
    const reserve = { minerals: 250, food: race === 'human' ? 0 : 120, energy: 150 };
    for (const k of war) {
      const c = SHIPS[race][k].cost;
      let n = 50;
      for (const [r, v] of Object.entries(c)) if (v > 0) n = Math.min(n, Math.floor(((st.stock[r] || 0) - (reserve[r] || 0)) / v));
      if (n >= (k === 'heavy' ? 1 : 2)) {
        type = k;
        count = Math.min(n, k === 'heavy' ? 4 : 8);
        break;
      }
    }
  }
  if (!type) return;
  if (st.plan.length) {
    // Recherche au fil comprise : le vaisseau doit être ouvert à son tour (sinon refus).
    if (!shipUnlocked(race, type, planAhead(st).tech)) return;
    return ctx.order(() => ctx.s.planShips(type, count, pl.key));
  }
  if (startShips(copy(pl.planet), type, count, ctx.now)) return;
  ctx.order(() => ctx.s.buildShips(type, count, pl.key));
}
