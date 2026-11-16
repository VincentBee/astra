import { settle } from '../game/index.js';
import { freeze, fleetCargo, fleetTank } from '../fleet/index.js';

/**
 * Ajoute `amt` à une partie. Une flotte ne garde que ce qui tient dans ses
 * soutes et ses réservoirs (elle a pu perdre des vaisseaux entre-temps).
 */
export function put(side, race, amt, now) {
  if (side.planet) {
    settle(side.planet, now);
    const s = side.planet.stock;
    s.minerals = (s.minerals || 0) + (amt.minerals || 0);
    s.food = (s.food || 0) + (amt.food || 0);
    s.energy = (s.energy || 0) + (amt.fuel || 0);
    return;
  }
  const f = side.fleet;
  freeze(f, race, now);
  let room = Math.max(0, fleetCargo(race, f.ships) - (f.cargo?.minerals || 0) - (f.cargo?.food || 0));
  const minerals = Math.min(room, amt.minerals || 0);
  room -= minerals;
  const food = Math.min(room, amt.food || 0);
  f.cargo = { ...f.cargo, minerals: (f.cargo?.minerals || 0) + minerals, food: (f.cargo?.food || 0) + food };
  f.fuel = Math.min(fleetTank(race, f.ships), f.fuel + (amt.fuel || 0));
}
