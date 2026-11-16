import { SOIL } from '../../game/index.js';
import { fleetCargo } from '../caracteristiques/fleet-cargo.js';

/**
 * Butin d'une attaque gagnée : jusqu'à la moitié des minéraux et de la
 * nourriture du défenseur, dans la place qui reste dans les soutes des
 * survivants (`carried` : ce qu'elles contiennent déjà).
 */
export function plunder(race, ships, stock, carried = {}) {
  let room = Math.max(0, fleetCargo(race, ships) - SOIL.reduce((t, r) => t + (carried[r] || 0), 0));
  const take = {};
  for (const r of SOIL) {
    const v = Math.floor(Math.min(room, (stock[r] || 0) / 2));
    take[r] = Math.max(0, v);
    room -= take[r];
  }
  return take;
}
