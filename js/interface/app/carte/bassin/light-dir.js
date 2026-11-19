/**
 * D'où vient la lumière pour un objet vu en (x, y) à l'écran : surtout du soleil (en `sun`,
 * à l'écran), un peu d'en haut. Vecteur unitaire, en pixels d'écran.
 */
export function lightDir(x, y, sun) {
  let dx = sun.x - x;
  let dy = sun.y - y;
  const d = Math.hypot(dx, dy) || 1;
  dx = (dx / d) * 0.75;
  dy = (dy / d) * 0.75 - 0.55;
  const n = Math.hypot(dx, dy) || 1;
  return { x: dx / n, y: dy / n };
}
