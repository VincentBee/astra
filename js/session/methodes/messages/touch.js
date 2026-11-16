import { FORMAT } from '../../constantes/format.js';
import { MAX_ORDERS } from '../../constantes/max-orders.js';

/** J'ai modifié ma fiche : je la date et je la diffuse. */
export function touch(log) {
  const p = this.state.players[this.me];
  p.actAt = Math.max(this.now(), (p.actAt || 0) + 1);
  p.v = FORMAT;
  // L'ordre (ou le passage) qui a changé ma fiche rejoint mon journal, une fois.
  if (this.entry && !this.entryKept) {
    this.entryKept = true;
    p.orders = [...(p.orders || []), this.entry].slice(-MAX_ORDERS);
  }
  this.spread(p, log);
}
