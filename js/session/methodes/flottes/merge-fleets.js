import { merge } from '../../../fleet.js';

/** Fusionne une de mes flottes dans une autre, sur la même case. */
export function mergeFleets(fromId, intoId) {
  if (!this.canAct) return false;
  const pair = this.pairOf(fromId, intoId);
  if (!pair) return false;
  const p = this.state.players[this.me];
  merge(pair[0], pair[1], p.race, this.now());
  p.fleets = p.fleets.filter((f) => f.id !== fromId);
  this.touch();
  this.changed();
  return true;
}
