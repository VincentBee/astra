import { BASSIN } from './bassin.js';
import { planePath } from './plane-path.js';

/** La lumière du soleil sur le fond du bassin : une flaque orangée autour de lui. */
export function drawSunPool(ctx, view, sun) {
  const u = sun.x + sun.size / 2;
  const v = sun.y + sun.size / 2;
  const p = view.pt(u, v, -BASSIN.floor);
  const r = sun.size * 2.2 * p.s;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  g.addColorStop(0, 'rgba(255,170,80,0.22)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  planePath(ctx, view, u, v, sun.size * 2.2, -BASSIN.floor, 40);
  ctx.fill();
  ctx.restore();
}
