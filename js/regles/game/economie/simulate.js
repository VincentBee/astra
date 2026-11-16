import { steps } from './steps.js';

/** Idem, en coupant à la fin d'une transe (production doublée jusqu'à `trance`). */
export function simulate(race, s, from, to, trance = 0) {
  if (trance > from) {
    const mid = Math.min(to, trance);
    s = steps(race, s, from, mid, 2);
    from = mid;
  }
  return steps(race, s, from, to, 1);
}
