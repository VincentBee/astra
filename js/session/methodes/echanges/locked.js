/** Une de mes flottes attend la réponse à un échange : elle ne bouge pas (message, et true). */
export function locked(id) {
  const busy = (this.state.players[this.me]?.offers || []).some((o) => o.from.fleet === id);
  if (busy) this.ontoast?.('Cette flotte attend la réponse à un échange : elle ne peut rien faire d’autre d’ici là.');
  return busy;
}
