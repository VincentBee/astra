/**
 * Planète où s'est posée ma flotte `id` (D-360) : `p.docked` garde l'identifiant de la planète
 * de l'univers, retrouvée par sa case (un ancien « home » est réécrit quand je perds ma planète mère).
 */
export function dockedPlanet(p, id) {
  return this.planetRef(p, p.docked?.[id]);
}
