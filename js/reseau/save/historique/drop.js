import { GAME_KEY } from '../constantes.js';
import { remove } from '../stockage/remove.js';

export function drop(gid, idx) {
  delete idx[gid];
  remove(GAME_KEY + gid);
}
