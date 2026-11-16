import { SHIPS } from '../../tech/index.js';

/** Capacité totale des soutes. */
export function fleetCargo(race, ships) {
  let c = 0;
  for (const [k, n] of Object.entries(ships)) c += (n || 0) * SHIPS[race][k].cargo;
  return c;
}
