import { fleetTank, fuelAt } from '../../../fleet.js';

/** « carburant 34 / 40 » */
export const fuelText = (race, f, now) => `carburant ${Math.floor(fuelAt(f, race, now))} / ${fleetTank(race, f.ships)}`;
