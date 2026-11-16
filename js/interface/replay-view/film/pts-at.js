import { etat } from '../etat.js';

/** Points d'un joueur à l'instant `time` (sa courbe est en escalier), null avant son arrivée. */
export function ptsAt(pid, time) {
  let v = null;
  for (const s of etat.film.scores[pid] || []) {
    if (s.t > time) break;
    v = s.pts;
  }
  return v;
}
