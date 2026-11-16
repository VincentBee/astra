import { fuelAt } from '../caracteristiques/fuel-at.js';

/** Fige le carburant d'une flotte arrêtée : son segment devient immobile, à `now`. */
export function freeze(f, race, now) {
  Object.assign(f, { fuel: fuelAt(f, race, now), from: { ...f.to }, depart: now, arrive: now });
}
