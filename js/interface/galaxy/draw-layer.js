import { mod } from './mod.js';
import { rng } from './rng.js';
import { TINTS } from './tints.js';

/** Dessine les étoiles d'une couche dans le contexte g (tw × th en pixels CSS). */
export function drawLayer(g, L, i, tw, th) {
  const rand = rng(7919 * (i + 1));
  // Plus d'étoiles sur un grand écran, à densité égale.
  const n = Math.round(L.count * ((tw * th) / (400 * 800)));
  for (let k = 0; k < n; k++) {
    // Une partie des étoiles se serre le long d'une bande en diagonale : la Voie lactée.
    let x = rand() * tw;
    let y = rand() * th;
    if (rand() < 0.45) {
      const t = rand();
      x = t * tw;
      y = mod(th * (0.85 - 0.6 * t) + (rand() + rand() + rand() - 1.5) * th * 0.12, th);
    }
    const r = L.size[0] + rand() * (L.size[1] - L.size[0]);
    g.fillStyle = `rgba(${TINTS[Math.floor(rand() * TINTS.length)]},${L.alpha[0] + rand() * (L.alpha[1] - L.alpha[0])})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}
