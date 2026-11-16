import { planetsFor } from '../../../game.js';

/** Planètes de l'univers (les mêmes sur tous les téléphones, tirées de l'identifiant de la partie). */
export function planets() {
  if (this.world?.gid !== this.state?.gid) this.world = { gid: this.state?.gid, list: this.state ? planetsFor(this.state.gid) : [] };
  return this.world.list;
}
