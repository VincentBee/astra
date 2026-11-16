import { SAVE_KEY } from '../constantes.js';
import { migrate } from '../historique/migrate.js';
import { read } from '../stockage/read.js';
import { valid } from '../stockage/valid.js';

/** { me, savedAt, state } de la partie en cours, ou null. */
export function loadGame() {
  migrate();
  const s = read(SAVE_KEY, null);
  return valid(s) ? s : null;
}
