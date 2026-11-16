import { fuelAt } from '../fleet/index.js';

/** Ce que possède une partie. */
export function holdings(side, race, now) {
  if (side.fleet) {
    const f = side.fleet;
    return { minerals: f.cargo?.minerals || 0, food: f.cargo?.food || 0, fuel: Math.floor(fuelAt(f, race, now)) };
  }
  const s = side.planet.stock || {};
  return { minerals: Math.floor(s.minerals || 0), food: Math.floor(s.food || 0), fuel: Math.floor(s.energy || 0) };
}
