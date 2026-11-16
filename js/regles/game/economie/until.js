import { advance } from './advance.js';
import { stepOf } from '../temps/step-of.js';
import { covers } from '../construction/covers.js';

/**
 * Fait avancer `s` de `from` vers `to` jusqu'à ce que le stock couvre l'un des
 * prix `costs` (vérifié avant de partir, puis après chaque pas). Les pas sont
 * ceux de `steps` (`stepOf` : 2 h de jeu au plus, MAX_STEPS au plus). Renvoie
 * { s, at, ok, k } : `k` est le premier prix de la liste couvert.
 */
export function until(race, s, from, to, costs, trance) {
  const hit = () => costs.findIndex((c) => covers(s.stock, c));
  let k = hit();
  if (k >= 0) return { s, at: from, ok: true, k };
  const dt = stepOf(to - from);
  let t = from;
  while (t < to) {
    const ms = Math.min(dt, to - t);
    s = advance(race, s, ms, trance > t ? 2 : 1);
    t += ms;
    k = hit();
    if (k >= 0) return { s, at: t, ok: true, k };
  }
  return { s, at: to, ok: false, k: -1 };
}
