import { GAME_KEY } from '../game-key.js';
import { remove } from '../stockage/remove.js';

export function drop(gid, idx) {
  delete idx[gid];
  remove(GAME_KEY + gid);
}
