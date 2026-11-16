import { GAP } from './gap.js';

/** Le plus proche et ceux qui sont presque aussi près que lui (à départager). */
export function contenders(hits, px) {
  if (!hits.length) return [];
  return hits.filter((h) => (h.d - hits[0].d) * px < GAP);
}
