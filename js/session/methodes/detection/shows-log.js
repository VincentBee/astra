/**
 * Une ligne du journal partagé, montrée dans mon Journal (D-210) ? Une ligne marquée d'une
 * flotte (ordre d'attaque, de conquête, de poursuite…) ne l'est que pour son auteur, ou tant
 * que je vois cette flotte : sinon l'ordre trahirait une flotte que la carte me cache (D-128).
 * Flotte disparue (posée, détruite, fusionnée hors de vue) : la ligne reste cachée ; le combat,
 * lui, a ses propres lignes.
 */
export function showsLog(l, now = this.now()) {
  if (!l?.fleet || l.pid === this.me) return true;
  const owner = this.state.players[l.pid];
  const f = owner && this.fleetOf(owner, l.fleet);
  return !!f && this.sees(owner, f, now);
}
