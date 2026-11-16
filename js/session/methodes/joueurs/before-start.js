/** Avant le départ, la partie pas encore partie et sans planète : sinon null. */
export function beforeStart() {
  const p = this.state?.players[this.me];
  return !!p && this.startedAt == null && !p.home && !Number.isFinite(p.since);
}
