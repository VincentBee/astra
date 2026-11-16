import { PLAN_MAX } from '../../../game.js';
import { MIN } from '../donnees/min.js';
import { chooseBuilding } from './choose-building.js';
import { freePlaces } from './free-places.js';

/**
 * Ajoute un bâtiment au fil de construction, quand le fil n'en tient pas déjà un (recherches et
 * vaisseaux au fil ne l'empêchent pas, D-421).
 */
export function planBuilding(ctx, pl, st) {
  if (ctx.left <= 0 || st.plan.length >= PLAN_MAX || st.plan.some((x) => typeof x === 'string')) return;
  const free = freePlaces(pl.planet, st);
  if (free <= 0) return;
  // Planète que le froid prendra bientôt : on n'y investit plus.
  if (ctx.s.frostOf(pl.cell) - ctx.now < 2 * MIN) return;
  const key = chooseBuilding(ctx.p.race, st, free, pl.key === 'home');
  if (key) ctx.order(() => ctx.s.planBuild(key, pl.key));
}
