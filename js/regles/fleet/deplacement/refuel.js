import { settle } from '../../game/index.js';
import { fleetTank } from '../caracteristiques/fleet-tank.js';
import { fuelAt } from '../caracteristiques/fuel-at.js';

/**
 * Plein sur une planète du joueur, avec l'énergie de son stock (plein
 * partiel s'il n'y en a pas assez). La flotte doit être arrêtée. Renvoie
 * la quantité versée.
 */
export function refuel(planet, f, race, now) {
  settle(planet, now);
  const fuel = fuelAt(f, race, now);
  const give = Math.max(0, Math.floor(Math.min(fleetTank(race, f.ships) - fuel, planet.stock.energy || 0)));
  // Nouveau segment immobile : le carburant d'un segment est celui de son départ.
  Object.assign(f, { from: { ...f.to }, depart: now, arrive: now, fuel: fuel + give, stranded: false });
  planet.stock.energy -= give;
  return give;
}
