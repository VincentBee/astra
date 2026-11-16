import { POWERS, powerReadyAt, powerCost, liftGain } from '../../../game.js';

/** Pouvoirs des aliens : arrachement et transe, dès qu'ils sont prêts et utiles. */
export function usePowers(ctx, pl, st) {
  if (ctx.p.race !== 'alien' || ctx.left <= 0) return;
  for (const key of Object.keys(POWERS)) {
    if (ctx.left <= 0) return;
    if (powerReadyAt(pl.planet, key) > ctx.now) continue;
    const cost = powerCost(pl.planet, key, st.pop);
    // On garde l'énergie qui nourrit la population.
    if ((st.stock.energy || 0) < cost.energy + 60) continue;
    if (key === 'lift' && liftGain({ ...pl.planet, stock: st.stock, reserve: st.reserve || pl.planet.reserve, pop: st.pop, levels: st.levels }) < 40) continue;
    if (key === 'trance' && pl.planet.nature?.minerals && (st.reserve?.minerals || 0) < 1) continue;
    ctx.order(() => ctx.s.power(key, pl.key));
  }
}
