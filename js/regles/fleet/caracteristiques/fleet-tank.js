import { SHIPS } from '../../tech/index.js';

/** Contenance totale des réservoirs. */
export function fleetTank(race, ships) {
  let t = 0;
  for (const [k, n] of Object.entries(ships)) t += (n || 0) * SHIPS[race][k].tank;
  return t;
}
