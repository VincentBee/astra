import { holdGame } from '../../../reseau/tablock/index.js';

/** Prend le verrou de la partie en cours sans attendre (partie neuve, arrivée par invitation). */
export function claim() {
  const gid = this.state?.gid;
  holdGame(gid).then((h) => (this.state?.gid === gid ? this.adopt(h) : h.release()));
}
