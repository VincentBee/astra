import { UNIVERSE } from '../../../../regles/game/carte/universe.js';
import { noise } from '../noise.js';
import { BASSIN } from './bassin.js';
import { quadPath } from './quad-path.js';

/**
 * Le bassin (D-559) : le fond étoilé, ses parois, son rebord et sa face avant. `onFloor(ctx)`
 * dessine ce qui est posé sur le fond (halo de détection, froid, ombres) : il est appelé avec
 * le dessin limité au fond visible, pour que rien ne déborde sur les parois.
 */
export function drawBasin(ctx, view, onFloor) {
  const W = UNIVERSE.w;
  const H = UNIVERSE.h;
  const fl = -BASSIN.floor;
  const R = BASSIN.rim;
  const size = view.size;
  const high = view.height;

  // Autour : le vide, un peu plus clair au centre.
  const bg = ctx.createRadialGradient(size / 2, high * 0.45, size * 0.1, size / 2, high / 2, size * 0.75);
  bg.addColorStop(0, '#0b1024');
  bg.addColorStop(1, '#03050b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, high);

  // Face avant, sous le rebord proche.
  const fb = fl - BASSIN.base;
  const top = view.pt(0, H + R, 0);
  const low = view.pt(0, H + R, fb);
  const front = ctx.createLinearGradient(0, top.y, 0, low.y);
  front.addColorStop(0, '#26315c');
  front.addColorStop(1, '#0a0e1e');
  ctx.fillStyle = front;
  ctx.beginPath();
  quadPath(ctx, view, [[-R, H + R, 0], [W + R, H + R, 0], [W + R, H + R, fb], [-R, H + R, fb]]);
  ctx.fill();

  // Dans l'ouverture : les parois (fond de l'ouverture), puis le fond lui-même.
  ctx.save();
  ctx.beginPath();
  quadPath(ctx, view, [[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0]]);
  ctx.clip();
  const farTop = view.pt(0, 0, 0);
  const farLow = view.pt(0, 0, fl);
  const wall = ctx.createLinearGradient(0, farTop.y, 0, farLow.y);
  wall.addColorStop(0, '#1d2650');
  wall.addColorStop(1, '#0c1230');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, size, high);
  // Arêtes des coins du fond : on lit la profondeur des parois.
  ctx.strokeStyle = 'rgba(140,165,255,0.18)';
  ctx.lineWidth = Math.max(1, size / 600);
  ctx.beginPath();
  for (const [u, v] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const a = view.pt(u, v, 0);
    const b = view.pt(u, v, fl);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  ctx.beginPath();
  quadPath(ctx, view, [[0, 0, fl], [W, 0, fl], [W, H, fl], [0, H, fl]]);
  ctx.clip();
  const mid = view.pt(W / 2, H / 2, fl);
  const floor = ctx.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, size * 0.62 * view.z);
  floor.addColorStop(0, '#0b1230');
  floor.addColorStop(1, '#050816');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, size, high);

  // Étoiles du fond : les mêmes partout (bruit déterministe), très discrètes.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = noise(x, y);
      if (n <= 0.72) continue;
      const p = view.pt(x + noise(y, x), y + noise(x + 7, y + 3), fl);
      if (p.x < -4 || p.y < -4 || p.x > size + 4 || p.y > high + 4) continue;
      ctx.fillStyle = `rgba(220,230,255,${0.06 + (n - 0.72) * 0.7})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.s * 0.025 * (n * 2)), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Quadrillage du fond, très pâle : les cases.
  ctx.strokeStyle = 'rgba(150,170,230,0.07)';
  ctx.lineWidth = Math.max(1, size / 900);
  ctx.beginPath();
  for (let i = 1; i < W; i++) {
    const a = view.pt(i, 0, fl);
    const b = view.pt(i, H, fl);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (let i = 1; i < H; i++) {
    const a = view.pt(0, i, fl);
    const b = view.pt(W, i, fl);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  // Pied des parois : le fond s'assombrit contre elles (on sent le creux).
  const foot = 0.9;
  for (const [a, b, c, d] of [
    [[0, 0], [W, 0], [W, foot], [0, foot]],
    [[0, 0], [0, H], [foot, H], [foot, 0]],
    [[W, 0], [W, H], [W - foot, H], [W - foot, 0]],
    [[0, H], [W, H], [W, H - foot], [0, H - foot]],
  ]) {
    const m0 = view.pt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, fl);
    const m1 = view.pt((c[0] + d[0]) / 2, (c[1] + d[1]) / 2, fl);
    const g = ctx.createLinearGradient(m0.x, m0.y, m1.x, m1.y);
    g.addColorStop(0, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    quadPath(ctx, view, [[...a, fl], [...b, fl], [...c, fl], [...d, fl]]);
    ctx.fill();
  }
  onFloor?.(ctx);
  ctx.restore();

  // Le rebord : une bande claire autour de l'ouverture, plus lumineuse sur son arête intérieure.
  const rimTop = view.pt(W / 2, -R, 0);
  const rimLow = view.pt(W / 2, H + R, 0);
  const rim = ctx.createLinearGradient(0, rimTop.y, 0, rimLow.y);
  rim.addColorStop(0, '#222c55');
  rim.addColorStop(1, '#34427a');
  ctx.fillStyle = rim;
  ctx.beginPath();
  quadPath(ctx, view, [[-R, -R, 0], [W + R, -R, 0], [W + R, H + R, 0], [-R, H + R, 0]]);
  quadPath(ctx, view, [[0, 0, 0], [0, H, 0], [W, H, 0], [W, 0, 0]]);
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(170,190,255,0.45)';
  ctx.lineWidth = Math.max(1, size / 500);
  ctx.beginPath();
  quadPath(ctx, view, [[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0]]);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(170,190,255,0.2)';
  ctx.beginPath();
  quadPath(ctx, view, [[-R, -R, 0], [W + R, -R, 0], [W + R, H + R, 0], [-R, H + R, 0]]);
  ctx.stroke();
}
