/**
 * Début de la course : le départ donné quand tous les joueurs présents étaient prêts (`go`, le
 * plus ancien vu par un joueur). Une partie d'avant le départ commun partait à la première
 * installation (`since`). null : pas encore partie (ou partie d'avant la course, sans fin).
 */
export function startedAt() {
  const players = Object.values(this.state?.players || {});
  const go = players.map((p) => p.go).filter(Number.isFinite);
  if (go.length) return Math.min(...go);
  const t = players.map((p) => p.since).filter(Number.isFinite);
  return t.length ? Math.min(...t) : null;
}
