/** Joueurs présents (moi, et ceux en ligne avec moi) pas encore prêts ni déjà dans la course. */
export function notReady() {
  return Object.values(this.state?.players || {}).filter(
    (p) => (p.id === this.me || p.online) && !p.out && !Number.isFinite(p.left) && !p.home && !Number.isFinite(p.ready) && !Number.isFinite(p.since),
  );
}
