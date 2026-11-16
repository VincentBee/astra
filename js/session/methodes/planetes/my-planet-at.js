import { sameCell } from '../../../game.js';

/**
 * Ma planète (mère ou colonie) sur la case `cell`, ou null : la fiche de la
 * carte n'y montre « Voir la planète » que dans ce cas (D-138, D-139).
 * { key, planet, cell, name }
 */
export function myPlanetAt(cell) {
  return this.planetsOf(this.state.players[this.me]).find((pl) => sameCell(pl.cell, cell)) || null;
}
