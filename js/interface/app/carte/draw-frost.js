import { frostLine } from '../../../game.js';
import { etat } from '../etat.js';

/** Le froid : tout ce qui est hors du cercle autour du soleil est gelé. */
export function drawFrost(ctx, sun, cell, W) {
  const start = etat.session.startedAt;
  if (start == null) return;
  const line = frostLine(sun, start, Math.min(etat.session.now(), etat.session.over?.at ?? Infinity)); // la partie finie, le froid s'arrête
  if (!Number.isFinite(line)) return;
  const cx = (sun.x + sun.size / 2) * cell;
  const cy = (sun.y + sun.size / 2) * cell;
  const r = (line + sun.size / 2) * cell;
  ctx.save();
  ctx.fillStyle = 'rgba(150,200,255,0.16)';
  ctx.beginPath();
  ctx.rect(0, 0, W, W);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(170,215,255,0.7)';
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.setLineDash([cell * 0.25, cell * 0.15]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
