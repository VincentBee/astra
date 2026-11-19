import { BASSIN } from './bassin.js';

/**
 * Ombre douce sur le fond du bassin, sous un objet de rayon `r` (cases) au point (u, v) :
 * une tache sombre aplatie par la perspective.
 */
export function drawShadow(ctx, view, u, v, r, a = 0.55) {
  const h = -BASSIN.floor;
  const p = view.pt(u, v, h);
  const rx = r * p.s;
  const ry = Math.max(0.5, Math.abs(view.pt(u, v + r, h).y - view.pt(u, v - r, h).y) / 2);
  if (!(rx > 0.3)) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(0.6, `rgba(0,0,0,${a * 0.5})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
