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
