/** Nombre de joueurs connectés à ce téléphone (hors lui-même). */
export function peerCount() {
  return this.links.size;
}
