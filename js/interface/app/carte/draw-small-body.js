import { sunFor } from '../../../game.js';
import { etat } from '../etat.js';
import { noise } from './noise.js';

/**
 * Astéroïde (un caillou irrégulier) ou comète (une tête et une queue qui
 * fuit le soleil), plus petits qu'une planète.
 */
export function drawSmallBody(ctx, w, cx, cy, cell, color) {
  if (w.kind === 'comet') {
    const sun = sunFor(etat.session.state.gid);
    const sx = (sun.x + sun.size / 2) * cell;
    const sy = (sun.y + sun.size / 2) * cell;
    const a = Math.atan2(cy - sy, cx - sx);
    const tail = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * cell * 0.8, cy + Math.sin(a) * cell * 0.8);
    tail.addColorStop(0, 'rgba(170,220,255,0.55)');
    tail.addColorStop(1, 'rgba(170,220,255,0)');
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a + Math.PI / 2) * cell * 0.1, cy + Math.sin(a + Math.PI / 2) * cell * 0.1);
    ctx.lineTo(cx + Math.cos(a) * cell * 0.8, cy + Math.sin(a) * cell * 0.8);
    ctx.lineTo(cx + Math.cos(a - Math.PI / 2) * cell * 0.1, cy + Math.sin(a - Math.PI / 2) * cell * 0.1);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = w.owner ? color : '#cfe8ff';
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Caillou : un polygone aux sommets irréguliers, le même à chaque image.
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const r = cell * (0.1 + 0.07 * noise(w.x * 7 + k, w.y * 3 + k));
    const t = (k / 7) * Math.PI * 2;
    ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(t) * r, cy + Math.sin(t) * r);
  }
  ctx.closePath();
  ctx.fill();
}
