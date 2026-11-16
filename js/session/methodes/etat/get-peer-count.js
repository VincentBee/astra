/** Nombre de joueurs connectés à ce téléphone (hors lui-même). */
export function getPeerCount() {
  return this.links.size;
}
