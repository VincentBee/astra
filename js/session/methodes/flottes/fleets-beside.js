import { together } from '../../../fleet.js';

/** Mes autres flottes arrêtées sur la même case que celle-ci. */
export function fleetsBeside(id) {
  const f = this.myFleet(id);
  const now = this.now();
  if (!f) return [];
  return (this.state.players[this.me].fleets || []).filter((g) => g.id !== id && together(f, g, now));
}
