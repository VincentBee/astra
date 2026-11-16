/** Je suis prêt, les joueurs présents aussi, et la partie n'est pas partie : je donne le départ. */
export function checkStart() {
  if (this.status !== 'playing' || !this.state || this.startedAt != null) return false;
  if (!Number.isFinite(this.state.players[this.me]?.ready) || this.notReady.length || this.tooMany) return false;
  return this.begin();
}
