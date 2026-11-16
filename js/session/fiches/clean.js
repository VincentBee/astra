import { normalize } from './normalize.js';

/** Copie sans les champs des anciennes versions (maître du jeu, époques, ressources d'avant les races). */
export function clean(state) {
  const st = JSON.parse(JSON.stringify(state));
  delete st.leader;
  delete st.epoch;
  delete st.nextRank;
  st.log ||= [];
  for (const p of Object.values(st.players || {})) normalize(p);
  return st;
}
