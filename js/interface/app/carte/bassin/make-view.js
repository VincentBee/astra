import { UNIVERSE } from '../../../../regles/game/carte/universe.js';
import { TILT } from '../zoom/tilt.js';
import { BASSIN } from './bassin.js';

/**
 * Projection du bassin (D-559), sans DOM : un canvas de `size` × `height` pixels montre la vue
 * (zoom `z`, coin haut-gauche `x0`, `y0`, en cases) en perspective, caméra en avant et au-dessus,
 * inclinée de `tilt` radians depuis la verticale (0 = vue de dessus, réglable : D-562).
 * - `pt(u, v, h)` : point de l'univers (u, v en cases, bord de l'univers à 0 et UNIVERSE.w ;
 *   le centre de la case x est à x + 0,5) à la hauteur `h` (cases, 0 = plan du jeu) →
 *   { x, y } en pixels du canvas, et `s` = pixels par case à cet endroit ;
 * - `unproj(sx, sy)` : point du canvas → { u, v } sur le plan du jeu (h = 0), l'inverse exact.
 * La projection ne dépend de x0, y0 que par u − x0, v − y0 : glisser la vue de d cases
 * déplace `unproj` de d cases (le glissé et le pincement s'en servent).
 */
export function makeView(size, height = size, z = 1, x0 = 0, y0 = 0, tilt = TILT.start) {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const D = BASSIN.dist;
  const V = UNIVERSE.w / z; // largeur de la vue, en cases
  // Hauteur, pour f = 1 : du bord du fond (vue entière) au bas de la face avant.
  const top1 = (-0.5 * c) / (D + 0.5 * s);
  const dz = (BASSIN.floor + BASSIN.base) / UNIVERSE.w;
  const bottom1 = (0.5 * c + dz * s) / (D - 0.5 * s + dz * c);
  // Le bord proche (Y = 0,5) occupe `fill` de la largeur, sauf si la vue est alors trop haute
  // pour le canvas (presque de dessus) : elle tient alors dans la hauteur.
  const f = Math.min(size * BASSIN.fill * (D - 0.5 * s), (height * 0.94) / (bottom1 - top1));
  // Centrée dans le canvas, avec un peu plus de place en haut pour les noms des planètes du fond.
  const top = f * top1;
  const bottom = f * bottom1;
  const cx = size / 2;
  const cy = height / 2 - (top + bottom) / 2 + size * 0.012;
  const pt = (u, v, h = 0) => {
    const X = (u - x0) / V - 0.5;
    const Y = (v - y0) / V - 0.5;
    const Z = h / V;
    const depth = Math.max(0.05, D - Y * s - Z * c);
    return { x: cx + (f * X) / depth, y: cy + (f * (Y * c - Z * s)) / depth, s: f / (V * depth) };
  };
  const unproj = (sx, sy) => {
    const a = (sx - cx) / f;
    const b = (sy - cy) / f;
    const Y = (b * D) / Math.max(1e-6, c + b * s);
    const X = a * (D - Y * s);
    return { u: x0 + (X + 0.5) * V, v: y0 + (Y + 0.5) * V };
  };
  return { size, height, z, x0, y0, tilt, V, f, cx, cy, pt, unproj };
}
