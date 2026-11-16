/** Offres des autres qui m'attendent : [{ from: joueur, offer }]. */
export function incomingOffers() {
  const me = this.state.players[this.me];
  const now = this.now();
  const out = [];
  for (const p of Object.values(this.state.players)) {
    if (p.id === this.me) continue;
    for (const o of p.offers || []) {
      if (o.to.pid !== this.me || now >= o.expires) continue;
      if ((me.answers || []).some((a) => a.offer === o.id && a.pid === p.id)) continue;
      out.push({ from: p, offer: o });
    }
  }
  return out;
}
