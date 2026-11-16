import { sameCell } from '../../../game.js';

/** Ma planète de l'univers (avec ses gisements de départ), ou null. */
export function myWorld() {
  const home = this.state?.players[this.me]?.home;
  return (home && this.planets.find((w) => sameCell(w, home))) || null;
}
