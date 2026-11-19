/** Le soleil (D-559) : une boule de lumière posée au milieu du bassin. */
export function drawSun3d(ctx, view, sun) {
  const u = sun.x + sun.size / 2;
  const v = sun.y + sun.size / 2;
  const p = view.pt(u, v, 0);
  const r = (sun.size / 2) * 0.92 * p.s;
  const glow = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * 1.8);
  glow.addColorStop(0, 'rgba(255,190,90,0.35)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(p.x - r * 1.8, p.y - r * 1.8, r * 3.6, r * 3.6);
  const disc = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.35, r * 0.08, p.x, p.y, r);
  disc.addColorStop(0, '#fffbe8');
  disc.addColorStop(0.4, '#ffd166');
  disc.addColorStop(0.85, '#ff8a3d');
  disc.addColorStop(1, '#e8602a');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}
