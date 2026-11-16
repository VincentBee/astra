import { reach } from './reach.js';

/**
 * Objets à portée du doigt, du plus proche au plus loin : [{ it, d }] (d en cases).
 * `items` : [{ x, y, … }] ; `at` : { x, y } ; `px` : taille d'une case en pixels CSS.
 */
export function underFinger(items, at, px) {
  const r = reach(px);
  return items
    .map((it) => ({ it, d: Math.hypot(it.x - at.x, it.y - at.y) }))
    .filter((h) => h.d <= r)
    .sort((a, b) => a.d - b.d);
}
