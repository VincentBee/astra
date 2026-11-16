import { SOIL, sameCell } from '../../regles/game/index.js';
import { amount } from './amount.js';
import { isCell } from './is-cell.js';
import { MAX_AMOUNT } from './max-amount.js';

/**
 * Ordre de navette (D-550) d'une fiche reçue ou relue : la forme seulement (deux cases, des
 * ressources du sol, l'escale visée). Une navette abîmée tombe ; la flotte reste où elle est.
 * Que les deux planètes soient bien les miennes se vérifie à chaque escale (`shuttleStop`).
 */
export function cleanShuttle(f) {
  const o = f.order;
  if (o?.kind !== 'shuttle') return;
  const ok = isCell(o.a) && isCell(o.b) && !sameCell(o.a, o.b) && Array.isArray(o.res) && o.res.length > 0 && o.res.every((r) => SOIL.includes(r)) && (o.go === 'a' || o.go === 'b');
  if (!ok) {
    f.order = null;
    return;
  }
  f.order = { kind: 'shuttle', a: { x: o.a.x, y: o.a.y }, b: { x: o.b.x, y: o.b.y }, res: SOIL.filter((r) => o.res.includes(r)), go: o.go, trips: Number.isInteger(o.trips) && o.trips > 0 ? o.trips : 0, sent: Object.fromEntries(SOIL.map((r) => [r, Math.min(amount(o.sent?.[r]), MAX_AMOUNT)]).filter(([, v]) => v > 0)) };
  if (o.wait === 'a' || o.wait === 'b') f.order.wait = o.wait;
}
