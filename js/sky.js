// Dessin du soleil sur une carte (jeu et replay) : un disque qui remplit son
// carré de cases, avec un halo qui déborde un peu autour.

/** Dessine `sun` ({ x, y, size }, en cases) sur `ctx`, à `cell` pixels par case. */
export function drawSun(ctx, sun, cell) {
  const cx = (sun.x + sun.size / 2) * cell;
  const cy = (sun.y + sun.size / 2) * cell;
  const r = (sun.size / 2) * cell;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.7);
  glow.addColorStop(0, 'rgba(255,190,90,0.35)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 1.7, cy - r * 1.7, r * 3.4, r * 3.4);
  const disc = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r * 0.92);
  disc.addColorStop(0, '#fff6d6');
  disc.addColorStop(0.45, '#ffd166');
  disc.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.fill();
}
