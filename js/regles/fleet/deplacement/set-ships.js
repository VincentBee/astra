import { fleetTank } from '../caracteristiques/fleet-tank.js';
import { fuelAt } from '../caracteristiques/fuel-at.js';

/**
 * Change les vaisseaux d'une flotte arrêtée (pertes d'un combat) : la
 * consommation change, donc on fige d'abord le carburant, sans dépasser
 * les nouveaux réservoirs.
 */
export function setShips(f, race, ships, now) {
  const fuel = Math.min(fuelAt(f, race, now), fleetTank(race, ships));
  Object.assign(f, { ships, from: { ...f.to }, depart: Math.min(now, f.arrive), arrive: Math.min(now, f.arrive), fuel });
}
