import { etat } from '../etat.js';

/** « Flotte 2 » : son rang parmi mes flottes. */
export function fleetName(f) {
  const i = (etat.session.state.players[etat.session.me]?.fleets || []).indexOf(f);
  return `Flotte ${i + 1}`;
}
