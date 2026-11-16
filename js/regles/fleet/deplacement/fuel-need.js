import { distance } from '../../../game.js';
import { fleetBurn } from '../caracteristiques/fleet-burn.js';
import { fleetPos } from './fleet-pos.js';

/** Ce qu'il faut de carburant pour aller de la position actuelle à `cell`. */
export function fuelNeed(f, race, cell, now) {
  return fleetBurn(race, f.ships) * distance(fleetPos(f, now), cell);
}
