import { sameCell } from '../../../regles/game/index.js';
import { moving, parkedCell } from '../../../regles/fleet/index.js';
import { de } from '../../textes/de.js';

/**
 * Avec qui échanger depuis `fromRef` (une de mes flottes ou planètes) :
 * les flottes arrêtées et la planète des autres joueurs sur la même case.
 * [{ pid, ref, name }]
 */
export function tradePartners(fromRef) {
  const now = this.now();
  const mine = this.tradeSide(this.state.players[this.me], fromRef, now);
  if (!mine) return [];
  const out = [];
  for (const p of Object.values(this.state.players)) {
    if (p.id === this.me) continue;
    for (const f of p.fleets || []) {
      if (moving(f, now) || !sameCell(parkedCell(f), mine.cell) || !this.sees(p, f, now)) continue;
      out.push({ pid: p.id, ref: { fleet: f.id }, name: `Flotte ${de(p.name)}` });
    }
    if (mine.side.fleet) {
      const pl = this.planetsOf(p).find((x) => sameCell(x.cell, mine.cell) && this.ownerAt(x.cell)?.id === p.id);
      if (pl) out.push({ pid: p.id, ref: { planet: pl.key }, name: `${pl.name} (${p.name})` });
    }
  }
  return out;
}
