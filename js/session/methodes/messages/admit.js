/** Fait entrer un joueur (nouveau ou de retour) et le présente aux autres. */
export function admit(link, pid, log) {
  this.attach(link, pid);
  link.send({ type: 'welcome', you: pid, from: this.me, state: this.snapshot() });
  // Les autres apprennent son arrivée de proche en proche…
  this.spread(this.state.players[pid], log, link);
  // …et l'appellent directement, en passant par moi pour se présenter.
  for (const [other, l] of this.links) if (other !== pid) l.send({ type: 'mesh-dial', peer: pid });
  this.changed();
}
