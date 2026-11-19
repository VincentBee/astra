import { shade } from './shade.js';

/**
 * Une boule éclairée (planète, tête de comète) : centre (x, y) et rayon `r` en pixels, couleur
 * `#rrggbb`, lumière venant de `light` (vecteur unitaire à l'écran).
 */
export function drawBall(ctx, x, y, r, color, light) {
  if (!(r > 0.2)) return;
  const g = ctx.createRadialGradient(x + light.x * r * 0.45, y + light.y * r * 0.45, r * 0.05, x, y, r * 1.05);
  g.addColorStop(0, shade(color, 0.65));
  g.addColorStop(0.3, shade(color, 0.1));
  g.addColorStop(0.75, shade(color, -0.45));
  g.addColorStop(1, shade(color, -0.8));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // Liseré d'atmosphère, du côté de la lumière.
  ctx.strokeStyle = shade(color, 0.5, 0.35);
  ctx.lineWidth = Math.max(0.8, r * 0.08);
  const a = Math.atan2(light.y, light.x);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.96, a - 1.2, a + 1.2);
  ctx.stroke();
}
