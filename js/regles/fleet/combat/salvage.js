import { SOIL } from '../../../game.js';
import { fleetCargo } from '../caracteristiques/fleet-cargo.js';

/**
 * Butin sur une flotte vaincue : toute sa cargaison, dans la place qui
 * reste dans les soutes des survivants.
 */
export function salvage(race, ships, cargo, carried = {}) {
  let room = Math.max(0, fleetCargo(race, ships) - SOIL.reduce((t, r) => t + (carried[r] || 0), 0));
  const take = {};
  for (const r of SOIL) {
    take[r] = Math.max(0, Math.floor(Math.min(room, cargo?.[r] || 0)));
    room -= take[r];
  }
  return take;
}
