import { moving, parkedCell } from '../../../regles/fleet/index.js';
import { de } from '../../textes/de.js';

/**
 * Partie d'un échange chez le joueur `p` : `ref` = { fleet: id } (arrêtée)
 * ou { planet: key }. { side, cell, name } ou null.
 */
export function tradeSide(p, ref, now) {
  if (!p) return null;
  if (ref?.fleet) {
    const f = this.fleetOf(p, ref.fleet);
    if (!f || moving(f, now)) return null;
    return { side: { fleet: f }, cell: parkedCell(f), name: `une flotte ${de(p.name)}` };
  }
  const pl = ref?.planet && this.planetRef(p, ref.planet);
  if (!pl || this.ownerAt(pl.cell)?.id !== p.id) return null;
  return { side: { planet: pl.planet }, cell: pl.cell, name: `${pl.name} (${p.name})` };
}
