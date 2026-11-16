import { ID_KEY, IDS_KEY } from '../constantes.js';
import { identities } from '../identite/identities.js';
import { read } from '../stockage/read.js';
import { write } from '../stockage/write.js';

/**
 * Les identités suivent l'historique (D-520) : on ne garde que celles des parties de l'index,
 * de `keep` (la partie en cours) et de l'identité en cours (partie rejointe pas encore sauvée).
 */
export function pruneIdentities(idx, keep) {
  const ids = identities();
  const live = new Set([...Object.keys(idx), ...keep, read(ID_KEY, null)?.gid]);
  let gone = false;
  for (const gid of Object.keys(ids)) if (!live.has(gid)) gone = delete ids[gid];
  if (gone) write(IDS_KEY, ids);
}
