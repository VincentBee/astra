import { sameCell } from '../../../game.js';

/**
 * Mes planètes et celles des autres sur une case : [{ owner, key, name }]. Une planète gelée
 * n'y est plus (D-450), même si la fiche de son propriétaire hors ligne la montre encore.
 */
export function planetsAt(cell, now = this.now()) {
  const out = [];
  for (const p of Object.values(this.state.players)) {
    for (const pl of this.planetsOf(p)) if (sameCell(pl.cell, cell) && this.frostOf(pl.cell) > now && this.ownerAt(pl.cell)?.id === p.id) out.push({ owner: p, key: pl.key, name: pl.name });
  }
  return out;
}
