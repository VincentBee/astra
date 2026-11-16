import { etat } from '../etat.js';

export function playersAt(i) {
  if (i < 0) return [];
  return Object.values(etat.film.at[i]).map((j) => etat.film.frames[j].fiche);
}
