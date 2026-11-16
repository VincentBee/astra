/**
 * Le joueur est-il dans la course ? Entré (`since`), ou prêt au départ d'une partie partie
 * (son téléphone n'a peut-être pas encore fait apparaître sa flotte).
 */
export function inRace(p) {
  return Number.isFinite(p?.since) || (Number.isFinite(p?.ready) && this.startedAt != null);
}
