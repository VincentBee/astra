import { GAME_KEY } from '../constantes.js';
import { read } from '../stockage/read.js';
import { valid } from '../stockage/valid.js';

/** Une partie de l'historique, ou null (absente ou abîmée, D-170). */
export function stored(gid) {
  const s = read(GAME_KEY + gid, null);
  return valid(s) && s.state.gid === gid ? s : null;
}
