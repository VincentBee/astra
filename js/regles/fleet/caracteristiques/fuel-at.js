import { distance } from '../../../game.js';
import { fleetTank } from './fleet-tank.js';
import { fleetBurn } from './fleet-burn.js';

/**
 * Carburant restant à `now`. `fuel` est celui du départ du segment ; une
 * flotte d'avant le carburant a le plein.
 */
export function fuelAt(f, race, now) {
  if (f.fuel == null) return fleetTank(race, f.ships);
  const k = Math.min(1, Math.max(0, (now - f.depart) / Math.max(1, f.arrive - f.depart)));
  return Math.max(0, f.fuel - fleetBurn(race, f.ships) * distance(f.from, f.to) * k);
}
