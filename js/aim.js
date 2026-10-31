// Visée sur la carte (D-126) : ce que le doigt touche, sans calcul de règles.
//
// Les objets (planètes, flottes) sont donnés en cases, centre de la case = (x, y), comme le
// point touché. Le doigt a une taille fixe à l'écran (FINGER pixels CSS) : à zoom 1, une case
// fait ~17 px sur un téléphone, le doigt en couvre plus d'une ; zoomé, il en couvre moins, mais
// jamais moins de MIN_REACH case. L'objet le plus proche gagne, sauf si d'autres sont presque
// aussi près (moins de GAP pixels d'écart) : alors on demande, au lieu de deviner.

export const FINGER = 18; // portée du doigt autour du point touché, en pixels CSS
export const MIN_REACH = 0.6; // portée minimale, en cases (carte très zoomée)
export const GAP = 12; // écart en pixels CSS sous lequel deux objets sont à égalité

/** Portée du doigt en cases, pour une case de `px` pixels CSS. */
export const reach = (px) => Math.max(MIN_REACH, FINGER / Math.max(1e-9, px));

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

/** Le plus proche et ceux qui sont presque aussi près que lui (à départager). */
export function contenders(hits, px) {
  if (!hits.length) return [];
  return hits.filter((h) => (h.d - hits[0].d) * px < GAP);
}

/**
 * Que veut dire ce toucher ? `items` : objets de la carte, chacun avec `type` :
 * 'planet', 'mine' (une de mes flottes, avec `id`) ou 'foe' (flotte adverse).
 * `sel` : id de ma flotte sélectionnée (ou null). `drag` : on lâche une flotte qu'on traînait
 * (mes flottes ne sont alors pas des cibles : on vise un endroit).
 * Renvoie { kind: 'empty' } (rien sous le doigt), { kind: 'one', it } ou { kind: 'many', list }.
 * - sans flotte sélectionnée, les flottes adverses ne comptent pas (rien à leur faire) ;
 * - ma flotte sélectionnée ne compte que seule et nettement la plus proche (la relâcher) :
 *   au milieu d'autres objets, c'est eux qu'on vise (elle est souvent en orbite de sa cible).
 */
export function readTap(items, at, px, sel = null, drag = false) {
  const pool = items.filter((it) => (it.type === 'foe' ? !!sel : it.type === 'mine' ? !drag : true));
  const top = contenders(underFinger(pool, at, px), px).map((h) => h.it);
  if (!top.length) return { kind: 'empty' };
  if (top.length === 1) return { kind: 'one', it: top[0] };
  const list = top.filter((it) => !(it.type === 'mine' && it.id === sel));
  return list.length === 1 ? { kind: 'one', it: list[0] } : { kind: 'many', list };
}

/**
 * Coin haut-gauche d'un menu de `w` × `h` posé à côté du point (sx, sy), dans une boîte de
 * `W` × `H` : à droite du doigt s'il y a la place, sinon à gauche ; centré en hauteur ; jamais
 * dehors (marge `m`).
 */
export function menuPlace(sx, sy, w, h, W, H, m = 8) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  let x = sx + 2 * m;
  if (x + w > W - m) x = sx - w - 2 * m;
  return { x: clamp(x, m, Math.max(m, W - w - m)), y: clamp(sy - h / 2, m, Math.max(m, H - h - m)) };
}
