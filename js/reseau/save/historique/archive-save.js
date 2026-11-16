import { GAME_KEY, INDEX_KEY, KEEP } from '../constantes.js';
import { drop } from './drop.js';
import { fit } from './fit.js';
import { oldestFirst } from './oldest-first.js';
import { pruneIdentities } from './prune-identities.js';

/** Range `save` (ancienne partie en cours) dans l'historique, en ne gardant que les plus récentes. */
export function archiveSave(save, idx, keep) {
  const gid = save.state.gid;
  idx[gid] = save.savedAt;
  for (const g of oldestFirst(idx).slice(0, Math.max(0, Object.keys(idx).length - (KEEP - 1)))) drop(g, idx);
  if (!(gid in idx)) return; // la plus vieille de toutes : elle sort
  if (!fit(GAME_KEY + gid, JSON.stringify(save), idx, [...keep, gid])) drop(gid, idx);
  fit(INDEX_KEY, JSON.stringify(idx), idx, keep);
  pruneIdentities(idx, keep);
}
