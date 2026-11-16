/** Écart entre l'heure de ce joueur et celle attendue (0 si nous avons l'heure commune, sinon la référence). */
export function clockDrift(link) {
  return link.skew - (this.clockSynced && link.sy ? 0 : this.clockRef[link.pid] ?? link.skew);
}
