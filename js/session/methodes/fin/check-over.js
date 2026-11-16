/**
 * La partie est-elle finie ? À plusieurs : quand il ne reste qu'un joueur
 * en vie (ou aucun : le dernier tombé gagne). Seul : quand le froid a tout
 * pris, et alors personne ne gagne (D-142). Si oui, je l'inscris dans ma fiche.
 */
export function checkOver(p, now) {
  if (this.over || this.startedAt == null) return false;
  const rank = this.ranking(now).filter((r) => this.inRace(this.state.players[r.id]));
  const alive = rank.filter((r) => r.dead == null);
  if (!rank.length || alive.length > (rank.length > 1 ? 1 : 0)) return false;
  const winner = rank.length > 1 ? rank[0] : null; // seul et tombé : c'est perdu
  const at = Math.max(...rank.map((r) => r.dead ?? -Infinity));
  p.over = { at: Number.isFinite(at) ? at : now, winner: winner?.id ?? null };
  this.addLog(winner
    ? `Fin de la partie : ${this.state.players[winner.id].name} l'emporte${alive.length ? ', dernier en vie' : ''}.`
    : 'Fin de la partie : le froid a tout pris.');
  return true;
}
