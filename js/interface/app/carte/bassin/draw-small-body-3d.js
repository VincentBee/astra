import { deps } from './deps.js';
import { drawBall } from './draw-ball.js';
import { drawRock } from './draw-rock.js';
import { lightDir } from './light-dir.js';

/**
 * Astéroïde (un caillou irrégulier) ou comète (une tête et une queue qui
 * fuit le soleil), plus petits qu'une planète. `P` : leur centre à l'écran ({ x, y, s }),
 * `sunAt` : le soleil à l'écran (lumière, D-559).
 */
export function drawSmallBody3d(ctx, view, w, P, color, sunAt) {
  const { etat, sunFor } = deps;
  const light = lightDir(P.x, P.y, sunAt);
  if (w.kind === 'comet') {
    const sun = sunFor(etat.session.state.gid);
    const u = w.x + 0.5;
    const v = w.y + 0.5;
    const a = Math.atan2(v - (sun.y + sun.size / 2), u - (sun.x + sun.size / 2));
    const at = (d, side) => view.pt(u + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * side, v + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * side, 0);
    const tip = at(0.8, 0);
    const tail = ctx.createLinearGradient(P.x, P.y, tip.x, tip.y);
    tail.addColorStop(0, 'rgba(170,220,255,0.55)');
    tail.addColorStop(1, 'rgba(170,220,255,0)');
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = tail;
    ctx.beginPath();
    const l = at(0, 0.1);
    const r = at(0, -0.1);
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(r.x, r.y);
    ctx.fill();
    ctx.restore();
    drawBall(ctx, P.x, P.y, P.s * 0.12, w.owner ? color : '#cfe8ff', light);
    return;
  }
  drawRock(ctx, w, P.x, P.y, P.s, color, light);
}
