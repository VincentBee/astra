import { GAME_KEY } from '../game-key.js';
import { drop } from '../historique/drop.js';
import { index } from '../historique/index-historique.js';
import { ID_KEY } from '../id-key.js';
import { identities } from '../identite/identities.js';
import { IDS_KEY } from '../ids-key.js';
import { INDEX_KEY } from '../index-key.js';
import { SAVE_KEY } from '../save-key.js';
import { read } from '../stockage/read.js';
import { remove } from '../stockage/remove.js';
import { write } from '../stockage/write.js';
import { loadGame } from './load-game.js';

/** Retire une partie de l'historique (et de la partie en cours si c'est elle). */
export function forgetGame(gid) {
  const idx = index();
  if (gid in idx) {
    drop(gid, idx);
    write(INDEX_KEY, idx);
  }
  remove(GAME_KEY + gid);
  if (loadGame()?.state.gid === gid) remove(SAVE_KEY);
  const ids = identities();
  delete ids[gid];
  write(IDS_KEY, ids);
  if (read(ID_KEY, null)?.gid === gid) remove(ID_KEY); // sinon identities() la remettrait (D-520)
}
