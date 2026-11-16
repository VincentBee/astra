import { shipStats } from '../../../tech.js';
import { slowestShip } from './slowest-ship.js';

/** Vitesse d'une flotte : celle de son vaisseau le plus lent (cases par minute). */
export function fleetSpeed(race, ships, tech) {
  const k = slowestShip(race, ships, tech);
  return k ? shipStats(race, k, tech).speed : 0;
}
