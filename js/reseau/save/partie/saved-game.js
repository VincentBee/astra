import { stored } from '../historique/stored.js';
import { loadGame } from './load-game.js';

/** Ma sauvegarde de la partie `gid` (en cours ou dans l'historique), ou null (D-260). */
export function savedGame(gid) {
  // Format D-415 : la partie en cours dans `astra.save`, les autres chacune dans `astra.save.<gid>`.
  const cur = loadGame();
  if (cur?.state.gid === gid) return cur;
  return typeof gid === 'string' && gid ? stored(gid) : null;
}
