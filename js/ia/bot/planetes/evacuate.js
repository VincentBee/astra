import { fleetTank, countShips, MAX_FLEETS } from '../../../fleet.js';

/** Le froid est presque là : les vaisseaux posés partent se poser sur la planète qui tiendra le plus longtemps. */
export function evacuate(ctx, pl, st) {
  if (ctx.left <= 1 || ctx.s.frostOf(pl.cell) - ctx.now > 40_000) return;
  const ships = Object.fromEntries(Object.entries(st.ships || {}).filter(([, n]) => n > 0));
  if (!countShips(ships) || (ctx.p.fleets || []).length >= MAX_FLEETS) return;
  const safe = ctx.s.planetsOf(ctx.p).filter((x) => x.key !== pl.key).sort((a, b) => ctx.s.frostOf(b.cell) - ctx.s.frostOf(a.cell))[0];
  if (!safe || ctx.s.frostOf(safe.cell) <= ctx.s.frostOf(pl.cell)) return;
  const fuel = Math.min(fleetTank(ctx.p.race, ships), Math.floor(st.stock.energy || 0));
  let id = null;
  ctx.order(() => (id = ctx.s.takeOff(pl.key, ships, {}, fuel)));
  if (id) ctx.order(() => ctx.s.moveFleet(id, safe.cell, 'dock'));
}
