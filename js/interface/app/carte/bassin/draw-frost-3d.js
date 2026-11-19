import { UNIVERSE } from '../../../../regles/game/carte/universe.js';
import { BASSIN } from './bassin.js';
import { deps } from './deps.js';
import { planePath } from './plane-path.js';
import { quadPath } from './quad-path.js';

/** Le froid : tout ce qui est hors du cercle autour du soleil est gelé (dessiné sur le fond du bassin, D-559). */
export function drawFrost3d(ctx, view, sun) {
  const { etat, frostLine } = deps;
  const start = etat.session.startedAt;
  if (start == null) return;
  const line = frostLine(sun, start, Math.min(etat.session.now(), etat.session.over?.at ?? Infinity)); // la partie finie, le froid s'arrête
  if (!Number.isFinite(line)) return;
  const u = sun.x + sun.size / 2;
  const v = sun.y + sun.size / 2;
  const r = line + sun.size / 2;
  const h = -BASSIN.floor;
  const s = view.pt(u, v, h).s;
  ctx.save();
  ctx.fillStyle = 'rgba(150,200,255,0.16)';
  ctx.beginPath();
  quadPath(ctx, view, [[0, 0, h], [UNIVERSE.w, 0, h], [UNIVERSE.w, UNIVERSE.h, h], [0, UNIVERSE.h, h]]);
  planePath(ctx, view, u, v, Math.max(0, r), h, 96);
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(170,215,255,0.7)';
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.setLineDash([s * 0.25, s * 0.15]);
  ctx.beginPath();
  planePath(ctx, view, u, v, Math.max(0, r), h, 96);
  ctx.stroke();
  ctx.restore();
}
