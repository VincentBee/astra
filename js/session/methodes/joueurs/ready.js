/**
 * Prêt à partir (`on`), ou plus prêt tant que la partie n'est pas partie. Elle part quand tous
 * les joueurs présents sont prêts (checkStart). Prêt après le départ : ma flotte arrive aussitôt.
 */
export function ready(on = true) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  if (!p?.race) return this.refuse('Choisis d’abord ta race.');
  if (p.home || Number.isFinite(p.since)) return false; // déjà dans la course
  if (on) {
    if (Number.isFinite(p.ready)) return false;
    p.ready = this.now();
    this.touch(this.addLog(`${p.name} est prêt.`));
  } else {
    if (!Number.isFinite(p.ready) || this.startedAt != null) return false;
    delete p.ready;
    this.touch(this.addLog(`${p.name} n’est plus prêt.`));
  }
  this.changed();
  return true;
}
