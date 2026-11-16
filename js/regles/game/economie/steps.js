import { advance } from './advance.js';
import { stepOf } from '../temps/step-of.js';

/**
 * Fait avancer de `from` à `to` (ms réelles). Des pas de 2 h de jeu au plus
 * (2 min réelles au tempo d'origine) : plus longs, une longue absence ne
 * donnerait pas la même population que des passages réguliers.
 */
export function steps(race, s, from, to, boost) {
  let t = from;
  const total = to - from;
  if (total <= 0) return s;
  const dt = stepOf(total);
  while (t < to) {
    const ms = Math.min(dt, to - t);
    s = advance(race, s, ms, boost);
    t += ms;
  }
  return s;
}
