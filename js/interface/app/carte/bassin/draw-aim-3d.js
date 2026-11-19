import { BASSIN } from './bassin.js';
import { planePath } from './plane-path.js';
import { quadPath } from './quad-path.js';

/** Pendant qu'on traîne une flotte : un trait jusqu'à la cible, la cible entourée, l'ordre écrit au-dessus du doigt. */
export function drawAim3d(ctx, view, dpr, aim) {
  if (!aim) return;
  const { from, it, at } = aim;
  const tu = (it ? it.x : aim.cell ? aim.cell.x : at.x) + 0.5;
  const tv = (it ? it.y : aim.cell ? aim.cell.y : at.y) + 0.5;
  const th = it && it.type !== 'planet' ? BASSIN.ship : 0; // une flotte vole au-dessus du plan
  const color = aim.short || aim.foe ? '#ff7a93' : '#ffffff';
  const a = view.pt(from.x + 0.5, from.y + 0.5, BASSIN.ship);
  const t = view.pt(tu, tv, th);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(1.5, t.s * 0.05);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(t.x, t.y);
  ctx.stroke();
  if (it) {
    ctx.beginPath();
    planePath(ctx, view, tu, tv, it.type === 'planet' ? 0.55 : 0.32, th);
    ctx.stroke();
  } else if (aim.cell && aim.t.kind === 'empty') {
    const { x, y } = aim.cell;
    ctx.beginPath();
    quadPath(ctx, view, [[x + 0.04, y + 0.04, 0], [x + 0.96, y + 0.04, 0], [x + 0.96, y + 0.96, 0], [x + 0.04, y + 0.96, 0]]);
    ctx.stroke();
  }
  // L'ordre, au-dessus du doigt (sinon il le cache), gardé dans le canvas.
  const fs = 13 * dpr;
  ctx.font = `600 ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(aim.label).width + 12 * dpr;
  const W0 = ctx.canvas.width;
  const f = view.pt(at.x + 0.5, at.y + 0.5, 0);
  const lx = Math.min(W0 - tw / 2 - 4 * dpr, Math.max(tw / 2 + 4 * dpr, f.x));
  const ly = Math.max(fs + 6 * dpr, f.y - 48 * dpr);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#0a0e1c';
  ctx.fillRect(lx - tw / 2, ly - fs - 2 * dpr, tw, fs + 10 * dpr);
  ctx.strokeRect(lx - tw / 2, ly - fs - 2 * dpr, tw, fs + 10 * dpr);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(aim.label, lx, ly + 2 * dpr);
  ctx.restore();
}
