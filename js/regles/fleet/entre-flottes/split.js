import { transfer } from './transfer.js';

/**
 * Scinde la flotte `a` : `part` part dans une nouvelle flotte, sur la même
 * case. Renvoie { error } ou { fleet }.
 */
export function split(a, race, part, id, now) {
  const b = { id, ships: {}, cargo: {}, fuel: 0, origin: a.origin, from: { ...a.to }, to: { ...a.to }, depart: now, arrive: now, order: null, stance: 'passive' };
  const error = transfer(a, b, race, part, now);
  return error ? { error } : { fleet: b };
}
