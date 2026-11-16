import { report } from '../alerte/report.js';
import { GAME_KEY } from '../game-key.js';
import { archiveSave } from '../historique/archive-save.js';
import { drop } from '../historique/drop.js';
import { fit } from '../historique/fit.js';
import { index } from '../historique/index-historique.js';
import { INDEX_KEY } from '../index-key.js';
import { SAVE_KEY } from '../save-key.js';
import { put } from '../stockage/put.js';
import { write } from '../stockage/write.js';
import { loadGame } from './load-game.js';

/**
 * Range la partie en cours. Seule `astra.save` est réécrite (D-415) : l'historique ne change
 * qu'au changement de partie. Mémoire pleine : on retire les plus anciennes parties de
 * l'historique jusqu'à ce que ça passe ; sinon le joueur est prévenu (`onSaveFailed`).
 * `journal` : mon carnet de combats (D-110), propre à ce téléphone.
 * `intel` : ce que j'ai vu des planètes des autres (brouillard, D-124), propre à ce téléphone.
 * `bots` : identifiants des joueurs IA que ce téléphone fait jouer (D-151).
 * Renvoie `true` si la partie est sauvée.
 */
export function saveGame(me, state, journal, intel, bots) {
  const save = { v: 1, me, savedAt: Date.now(), state, ...(journal ? { journal } : {}), ...(intel ? { intel } : {}), ...(bots?.length ? { bots } : {}) };
  const gid = state.gid;
  const idx = index();
  const prev = loadGame();
  const text = JSON.stringify(save);
  let ok = put(SAVE_KEY, text) === true;
  if (!ok) {
    // Une ancienne copie de cette partie dans l'historique fait de la place la première : elle
    // ne sert plus. Ensuite seulement, les plus vieilles parties.
    const copy = gid in idx ? [localStorage.getItem(GAME_KEY + gid), idx[gid]] : null;
    if (copy) drop(gid, idx);
    ok = fit(SAVE_KEY, text, idx, [gid]);
    if (!ok && copy?.[0] != null && write(GAME_KEY + gid, copy[0])) idx[gid] = copy[1]; // rien n'est perdu
  }
  if (!ok) return report(false);
  const twice = gid in idx;
  if (twice) drop(gid, idx); // stockée une seule fois
  if (prev && prev.state.gid !== gid) archiveSave(prev, idx, [gid]); // l'ancienne partie en cours rejoint l'historique
  else if (twice) write(INDEX_KEY, idx);
  return report(true);
}
