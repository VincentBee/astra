import { distance } from '../../game/index.js';
import { fleetSpeed } from '../caracteristiques/fleet-speed.js';
import { fleetBurn } from '../caracteristiques/fleet-burn.js';
import { fuelAt } from '../caracteristiques/fuel-at.js';
import { tripMs } from './trip-ms.js';
import { fleetPos } from './fleet-pos.js';

/**
 * Nouvel ordre de déplacement : la flotte part de là où elle est à `now`
 * vers la case `cell`, et `order` s'appliquera à l'arrivée (null : simple
 * déplacement). Modifie la flotte ; renvoie un message d'erreur ou null.
 */
export function moveTo(f, race, tech, cell, order, now) {
  const speed = fleetSpeed(race, f.ships, tech);
  if (!speed) return 'Cette flotte ne peut pas bouger.';
  const pos = fleetPos(f, now);
  const fuel = fuelAt(f, race, now);
  let to = { x: cell.x, y: cell.y };
  let stranded = false;
  const need = fleetBurn(race, f.ships) * distance(pos, to);
  if (need > fuel + 1e-9) {
    if (fuel < 1e-6) return 'Plus de carburant : fais le plein, ou attends qu’on te ravitaille.';
    // Panne en route : le trajet s'arrête là où le réservoir se vide, et l'ordre tombe.
    const k = fuel / need;
    to = { x: pos.x + (to.x - pos.x) * k, y: pos.y + (to.y - pos.y) * k };
    stranded = true;
    order = null;
  }
  Object.assign(f, { from: pos, to, depart: now, arrive: now + tripMs(pos, to, speed), order: order || null, fuel, stranded });
  return null;
}
