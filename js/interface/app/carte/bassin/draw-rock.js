import { noise } from '../noise.js';
import { shade } from './shade.js';

/** Astéroïde (D-559) : un caillou irrégulier, le même à chaque image, éclairé d'un côté. */
export function drawRock(ctx, w, x, y, s, color, light) {
  const g = ctx.createRadialGradient(x + light.x * s * 0.08, y + light.y * s * 0.08, s * 0.01, x, y, s * 0.2);
  g.addColorStop(0, shade(color, 0.45));
  g.addColorStop(0.6, shade(color, -0.2));
  g.addColorStop(1, shade(color, -0.7));
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const r = s * (0.1 + 0.07 * noise(w.x * 7 + k, w.y * 3 + k));
    const t = (k / 7) * Math.PI * 2;
    ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(t) * r, y + Math.sin(t) * r * 0.85);
  }
  ctx.closePath();
  ctx.fill();
}
