import { transfer } from '../../../fleet.js';

/** Fait passer vaisseaux, cargaison et carburant d'une de mes flottes à une autre. */
export function transferFleet(fromId, toId, part) {
  if (!this.canAct) return false;
  const pair = this.pairOf(fromId, toId);
  if (!pair) return false;
  const err = transfer(pair[0], pair[1], this.state.players[this.me].race, part, this.now());
  if (err) return this.refuse(err);
  this.touch();
  this.changed();
  return true;
}
