import { sameCell } from '../../../regles/game/index.js';
import { de } from '../../textes/de.js';

/**
 * La navette de `f` s'arrête (`why`) : une ligne au journal, renvoyée pour partir avec ma fiche.
 * Ne touche pas à l'ordre de la flotte : l'appelant le remplace ou l'efface. null sans navette.
 */
export function endShuttle(p, f, why) {
  const o = f?.order;
  if (o?.kind !== 'shuttle') return null;
  const name = (cell) => this.planets.find((w) => sameCell(w, cell))?.name || `[${cell.x}:${cell.y}]`;
  this.ontoast?.(`Navette arrêtée : ${why}.`);
  return this.addLog(`La navette ${de(p.name)} entre ${name(o.a)} et ${name(o.b)} s’arrête : ${why}.`, { pid: this.me, fleet: f.id });
}
