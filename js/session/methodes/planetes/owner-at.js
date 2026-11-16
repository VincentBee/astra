import { sameCell } from '../../../regles/game/index.js';

export function ownerAt(cell) {
  let best = null;
  const consider = (p, t) => {
    const k = [t, p.id];
    if (!best || k[0] < best.k[0] || (k[0] === best.k[0] && k[1] < best.k[1])) best = { p, k };
  };
  const w = this.planets.find((x) => sameCell(x, cell));
  const players = Object.values(this.state?.players || {});
  // Prise par un attaquant dont le rapport n'est pas encore lu : elle n'est déjà plus à son ancien propriétaire.
  // Une prise après la mort de l'attaquant ne compte pas (D-180).
  const taken = players.flatMap((o) => (o.effects || []).filter((e) => e.capture && sameCell(e.cell, cell) && !this.goneBy(o, e.at)));
  const lost = (p, t) => taken.some((e) => e.to === p.id && e.at >= t);
  for (const p of players) {
    if (Number.isFinite(p.out)) continue; // un joueur éliminé ne possède rien (D-180)
    const t = p.claimAt || p.rank || 0;
    if (sameCell(p.home, cell) && !lost(p, t)) consider(p, t);
    const col = w && p.colonies?.[w.id];
    if (col && !lost(p, col.claimAt || 0)) consider(p, col.claimAt || 0);
  }
  return best?.p || null;
}
