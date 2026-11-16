import { etat } from '../etat.js';

/** Dernière image à l'instant `time` (recherche dichotomique), -1 avant la première. */
export function frameAt(time) {
  let lo = 0;
  let hi = etat.film.frames.length - 1;
  if (etat.film.frames[0].t > time) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (etat.film.frames[mid].t <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
