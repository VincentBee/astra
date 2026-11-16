import { GAME_KEY, INDEX_KEY } from '../constantes.js';
import { put } from '../stockage/put.js';
import { write } from '../stockage/write.js';
import { drop } from './drop.js';
import { oldestFirst } from './oldest-first.js';

/**
 * Écrit `k`. Si la mémoire est pleine, retire la plus ancienne partie de l'historique (jamais
 * celles de `keep`) et réessaie, jusqu'à ce que ça passe. Si rien n'y fait, les parties retirées
 * sont remises (elles tenaient avant) et la réponse est `false` : on n'a rien perdu pour rien.
 * `idx` est l'index en mémoire, tenu à jour.
 */
export function fit(k, text, idx, keep) {
  const taken = [];
  for (;;) {
    const r = put(k, text);
    if (r === true) {
      if (taken.length) write(INDEX_KEY, idx);
      return true;
    }
    const gid = r === 'full' && oldestFirst(idx).find((g) => !keep.includes(g));
    if (!gid) break;
    taken.push([gid, idx[gid], localStorage.getItem(GAME_KEY + gid)]);
    drop(gid, idx);
  }
  for (const [gid, at, text] of taken.reverse()) {
    if (text != null && write(GAME_KEY + gid, text)) idx[gid] = at;
  }
  return false;
}
