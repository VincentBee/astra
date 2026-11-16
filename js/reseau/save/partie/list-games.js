import { index } from '../historique/index-historique.js';
import { stored } from '../historique/stored.js';
import { loadGame } from './load-game.js';

/** Les dernières parties jouées sur ce téléphone, la plus récente d'abord. */
export function listGames() {
  const cur = loadGame();
  const out = Object.keys(index())
    .filter((gid) => gid !== cur?.state.gid)
    .map(stored)
    .filter(Boolean);
  if (cur) out.push(cur);
  return out.sort((a, b) => b.savedAt - a.savedAt);
}
