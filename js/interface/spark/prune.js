import { HISTORY_MS } from './history-ms.js';

/** On oublie les relevés de plus de 10 minutes. */
export function prune(serie, now) {
  const drop = serie.t.findIndex((t) => now - t <= HISTORY_MS);
  const cut = drop < 0 ? serie.t.length : drop;
  if (cut <= 0) return;
  serie.t.splice(0, cut);
  for (const a of Object.values(serie.v)) a.splice(0, a.length - serie.t.length);
}
