/** Colonisateurs (posés, en vol) et planètes : de quoi savoir s'il en faut un autre. */
export function colonyCount(ctx) {
  const p = ctx.p;
  // Au fil compris (D-421) : un colonisateur qui attend son tour compte déjà.
  const planned = (x) => (x.planet.plan || []).reduce((t, it) => t + (it?.ship === 'colony' ? it.n : 0), 0);
  const docked = ctx.s.planetsOf(p).reduce((t, x) => t + (x.planet.ships?.colony || 0) + (x.planet.yard?.type === 'colony' ? x.planet.yard.count : 0) + planned(x), 0);
  const flying = (p.fleets || []).reduce((t, f) => t + (f.ships.colony || 0), 0);
  return ctx.s.planetsOf(p).length + docked + flying;
}
