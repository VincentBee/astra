import { deepFreeze } from './deep-freeze.js';

export function copyRec(rec) {
  const orders = rec.orders;
  if (!Array.isArray(orders)) return JSON.parse(JSON.stringify(rec));
  // Le journal reste à sa place parmi les clés : la fiche est la même, au caractère près.
  const out = JSON.parse(JSON.stringify({ ...rec, orders: [] }));
  const n = orders.length;
  const list = new Array(n);
  for (let i = 0; i < n - 1; i++) list[i] = deepFreeze(orders[i]);
  if (n) list[n - 1] = deepFreeze(JSON.parse(JSON.stringify(orders[n - 1] ?? null)));
  out.orders = list;
  return out;
}
