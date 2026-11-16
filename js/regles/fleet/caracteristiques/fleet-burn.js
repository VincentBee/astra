import { SHIPS } from '../../tech/index.js';

/** Carburant brûlé par case parcourue. */
export function fleetBurn(race, ships) {
  let b = 0;
  for (const [k, n] of Object.entries(ships)) b += (n || 0) * SHIPS[race][k].burn;
  return b;
}
