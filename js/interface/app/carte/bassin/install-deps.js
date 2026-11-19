import { deps } from './deps.js';

/** Le jeu donne au module 3D ses modules à état (voir `deps.js`). */
export function installDeps(given) {
  Object.assign(deps, given);
}
