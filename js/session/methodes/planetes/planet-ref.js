import { sameCell } from '../../../game.js';

/**
 * Ma planète désignée par sa clé (« home », id d'une colonie) ou par l'identifiant de sa
 * planète de l'univers, retrouvée par sa case : une colonie devenue planète mère (clé « home »)
 * reste trouvée par son identifiant (D-360).
 */
export function planetRef(p, ref) {
  if (!ref) return null;
  const pl = this.planetOf(p, ref);
  if (pl) return pl;
  const w = this.planets.find((x) => x.id === ref);
  return (w && this.planetsOf(p).find((x) => sameCell(x.cell, w))) || null;
}
