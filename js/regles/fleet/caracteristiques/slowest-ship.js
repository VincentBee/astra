import { shipStats } from '../../../tech.js';

/** Type du vaisseau le plus lent de la flotte (celui qui fixe sa vitesse), ou null si elle est vide. */
export function slowestShip(race, ships, tech) {
  let slow = null;
  let v = Infinity;
  for (const [k, n] of Object.entries(ships || {})) {
    if (!(n > 0)) continue;
    const sp = shipStats(race, k, tech).speed;
    if (sp < v) [slow, v] = [k, sp];
  }
  return slow;
}
