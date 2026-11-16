import { PLAN_MAX, startResearch } from '../../../game.js';
import { copy } from '../donnees/copy.js';
import { chooseTech } from './choose-tech.js';

/**
 * Labo libre : la recherche voulue part tout de suite si le fil est vide (et qu'on peut la
 * payer). Fil pas vide, elle irait de toute façon à sa fin (D-420) : on l'y met, une seule
 * recherche au fil à la fois, sans dépasser PLAN_MAX (D-421).
 */
export function planResearch(ctx, pl, st) {
  if (ctx.left <= 0) return;
  if (st.plan.length && (st.plan.length >= PLAN_MAX || st.plan.some((x) => x?.tech))) return;
  const key = chooseTech(ctx, pl, st);
  if (!key) return;
  if (st.plan.length) return ctx.order(() => ctx.s.planResearch(key, pl.key));
  // Essai sur une copie : l'ordre ne part que s'il passe (prix couvert).
  if (startResearch(copy(pl.planet), key, ctx.now)) return;
  ctx.order(() => ctx.s.research(key, pl.key));
}
