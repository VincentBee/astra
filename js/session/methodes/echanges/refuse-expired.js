/**
 * Offres pour moi expirées sans réponse : je les refuse, pour que celui
 * qui propose récupère sa part dès qu'il reçoit ma fiche.
 */
export function refuseExpired(p, now) {
  let any = false;
  for (const other of Object.values(this.state.players)) {
    if (other.id === this.me) continue;
    for (const o of other.offers || []) {
      if (o.to.pid !== this.me || now < o.expires) continue;
      if ((p.answers || []).some((a) => a.offer === o.id && a.pid === other.id)) continue;
      p.answers = this.keptAnswers([...(p.answers || []), { offer: o.id, pid: other.id, ok: false, at: now }]);
      any = true;
    }
  }
  return any;
}
