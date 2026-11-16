import { etat } from '../etat.js';
import { cellKey } from './cell-key.js';

/** Petit rond sur une de mes planètes à problème : rouge si pénurie, orange si le stock baisse. */
export function drawAlertDot(ctx, w, cx, cy, cell, pulse) {
  const a = etat.alertsNow.get(cellKey(w));
  if (!a) return;
  const short = a.list[0].kind === 'short';
  ctx.globalAlpha = 1;
  ctx.fillStyle = short ? '#ff6b7a' : '#ffb36b';
  ctx.strokeStyle = '#05070f';
  ctx.lineWidth = Math.max(1, cell * 0.04);
  ctx.beginPath();
  ctx.arc(cx + cell * 0.4, cy - cell * 0.32, cell * (short ? 0.2 + 0.04 * pulse : 0.17), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
