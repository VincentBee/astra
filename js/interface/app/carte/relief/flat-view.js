import { UNIVERSE } from '../../../../regles/game/index.js';

/**
 * La carte 2D d'origine, vue comme une projection (D-563) : même interface que `makeView` de la
 * carte en 3D, pour que le toucher, le zoom et le menu servent aux deux. Une case fait
 * `size × z / UNIVERSE.w` pixels partout ; la hauteur `h` ne compte pas.
 */
export function flatView(size, z = 1, x0 = 0, y0 = 0) {
  const cell = (size * z) / UNIVERSE.w;
  return {
    size,
    height: size,
    z,
    x0,
    y0,
    V: UNIVERSE.w / z,
    pt: (u, v) => ({ x: (u - x0) * cell, y: (v - y0) * cell, s: cell }),
    unproj: (sx, sy) => ({ u: x0 + sx / cell, v: y0 + sy / cell }),
  };
}
