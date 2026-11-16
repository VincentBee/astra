/** Départ de la partie, à cette heure (checkStart : tous les joueurs présents sont prêts). */
export function begin() {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  if (!Number.isFinite(p?.ready) || this.startedAt != null || this.tooMany) return false;
  p.go = this.now();
  this.touch(this.addLog('Tous les joueurs présents sont prêts : la partie commence.'));
  this.changed();
  return true;
}
