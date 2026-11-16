import { distance } from '../../../game.js';
import { fleetBurn, fuelAt } from '../../../fleet.js';
import { MIN } from '../donnees/min.js';

/** Se poser sur la plus proche de mes planètes que le froid ne prend pas tout de suite. */
export function dockNearest(ctx, f) {
  const { s, p, now } = ctx;
  const pos = { x: Math.round(f.to.x), y: Math.round(f.to.y) };
  const fuel = fuelAt(f, p.race, now);
  const spot = s
    .planetsOf(p)
    .filter((x) => s.frostOf(x.cell) - now > MIN && fleetBurn(p.race, f.ships) * distance(pos, x.cell) <= fuel + 1e-9)
    .sort((a, b) => distance(pos, a.cell) - distance(pos, b.cell))[0];
  if (spot) ctx.order(() => s.moveFleet(f.id, spot.cell, 'dock'));
}
