/**
 * La flotte de départ d'un autre joueur prêt dont le téléphone ne l'a pas encore fait apparaître
 * (hors ligne depuis le départ), ou null (D-163). Elle existe pour tous : on la voit, on la
 * combat, le froid la détruit. Toujours le même objet tant que rien ne change.
 */
export function ghostFleet(p) {
  const start = this.startedAt;
  if (!p?.race || p.id === this.me || start == null || !Number.isFinite(p.ready) || Number.isFinite(p.since) || p.home || p.out != null) return null;
  const key = `${this.state.gid}|${start}|${p.ready}`;
  const memo = (this.ghostMemo ||= new Map()).get(p.id);
  if (memo?.key === key) return memo.f;
  const f = this.startFleet(p, start);
  this.ghostMemo.set(p.id, { key, f });
  return f;
}
