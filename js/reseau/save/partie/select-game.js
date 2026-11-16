import { GAME_KEY } from '../game-key.js';
import { archiveSave } from '../historique/archive-save.js';
import { drop } from '../historique/drop.js';
import { fit } from '../historique/fit.js';
import { index } from '../historique/index-historique.js';
import { stored } from '../historique/stored.js';
import { ID_KEY } from '../id-key.js';
import { identities } from '../identite/identities.js';
import { INDEX_KEY } from '../index-key.js';
import { SAVE_KEY } from '../save-key.js';
import { put } from '../stockage/put.js';
import { write } from '../stockage/write.js';
import { loadGame } from './load-game.js';

/** Fait d'une partie de l'historique la partie en cours (avec mon identité dedans). */
export function selectGame(gid) {
  const cur = loadGame();
  const save = cur?.state.gid === gid ? cur : stored(gid);
  if (!save) return null;
  if (save !== cur) {
    const idx = index();
    const text = JSON.stringify(save);
    // D'abord la mettre en cours. Si la place manque, sa propre copie dans l'historique (qui ne
    // servira plus) part la première, avant toute autre partie.
    if (put(SAVE_KEY, text) !== true) {
      drop(gid, idx);
      if (!fit(SAVE_KEY, text, idx, [gid])) {
        write(GAME_KEY + gid, text); // remise à sa place : rien n'est perdu
        return null;
      }
    }
    drop(gid, idx);
    if (cur) archiveSave(cur, idx, [gid]);
    else write(INDEX_KEY, idx);
  }
  const id = identities()[gid];
  if (id) write(ID_KEY, id);
  return save;
}
