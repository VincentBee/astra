import { zoom } from '../zoom/zoom.js';

/** Pendant qu'on traîne une flotte : un trait jusqu'à la cible, la cible entourée, l'ordre écrit au-dessus du doigt. */
export function drawAim(ctx, cell, dpr, aim) {
  if (!aim) return;
  const { from, it, at } = aim;
  const tx = ((it ? it.x : aim.cell ? aim.cell.x : at.x) + 0.5) * cell;
  const ty = ((it ? it.y : aim.cell ? aim.cell.y : at.y) + 0.5) * cell;
  const color = aim.short || aim.foe ? '#ff7a93' : '#ffffff';
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(1.5, cell * 0.05);
  ctx.beginPath();
  ctx.moveTo((from.x + 0.5) * cell, (from.y + 0.5) * cell);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  if (it) {
    ctx.beginPath();
    ctx.arc(tx, ty, cell * (it.type === 'planet' ? 0.55 : 0.32), 0, Math.PI * 2);
    ctx.stroke();
  } else if (aim.cell && aim.t.kind === 'empty') ctx.strokeRect(aim.cell.x * cell + 1, aim.cell.y * cell + 1, cell - 2, cell - 2);
  // L'ordre, au-dessus du doigt (sinon il le cache), gardé dans la partie vue.
  const fs = 13 * dpr;
  ctx.font = `600 ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(aim.label).width + 12 * dpr;
  const left = zoom.x * cell;
  const top = zoom.y * cell;
  const W0 = ctx.canvas.width;
  const lx = Math.min(left + W0 - tw / 2 - 4 * dpr, Math.max(left + tw / 2 + 4 * dpr, (at.x + 0.5) * cell));
  const ly = Math.max(top + fs + 6 * dpr, (at.y + 0.5) * cell - 48 * dpr);
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
