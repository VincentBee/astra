import { shade } from './shade.js';

/**
 * Un petit vaisseau (D-559) : une flèche à deux pans, nez dans la direction `ang` (sur le plan),
 * posé en (u, v) à la hauteur `h`, de taille `k` (1 en route, plus petit à l'arrêt), réacteur
 * allumé quand il roule.
 */
export function drawShip3d(ctx, view, u, v, h, ang, k, color, moving, now) {
  const p = view.pt(u, v, h);
  const L = 0.3 * k;
  const Wd = 0.17 * k;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const at = (f, w, dh = 0) => view.pt(u + ca * f - sa * w, v + sa * f + ca * w, h + dh);
  const nose = at(L, 0);
  const left = at(-L * 0.62, Wd);
  const right = at(-L * 0.62, -Wd);
  const tail = at(-L * 0.35, 0);
  const spine = at(-L * 0.05, 0, 0.09 * k); // l'arête du dos, plus haute
  // Le pan tourné vers le haut de l'écran prend la lumière.
  const leftUp = left.y < right.y;
  const face = (a, b, c, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fill();
  };
  if (moving) {
    // Réacteur : une lueur derrière, qui tremble un peu.
    const r = p.s * 0.16 * k * (0.85 + 0.15 * Math.sin(now / 70 + u * 13));
    const g = ctx.createRadialGradient(tail.x, tail.y, 0, tail.x, tail.y, r);
    g.addColorStop(0, 'rgba(255,240,200,0.95)');
    g.addColorStop(0.4, shade(color, 0.3, 0.6));
    g.addColorStop(1, shade(color, 0, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(tail.x, tail.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  face(left, tail, spine, shade(color, -0.55));
  face(tail, right, spine, shade(color, -0.65));
  face(nose, left, spine, leftUp ? shade(color, 0.35) : shade(color, -0.25));
  face(nose, spine, right, leftUp ? shade(color, -0.25) : shade(color, 0.35));
  ctx.strokeStyle = shade(color, 0.6, 0.55);
  ctx.lineWidth = Math.max(0.6, p.s * 0.02);
  ctx.beginPath();
  ctx.moveTo(nose.x, nose.y);
  ctx.lineTo(spine.x, spine.y);
  ctx.stroke();
}
