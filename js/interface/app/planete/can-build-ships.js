import { shipsAffordable } from '../../../regles/game/index.js';
import { shipUnlocked } from '../../../regles/tech/index.js';
import { etat } from '../etat.js';

/** Lot de `n` vaisseaux `k` qu'on peut lancer maintenant sur cette planète (état `s`) ? */
export function canBuildShips(me, s, k, n) {
  return !!s.levels.yard && n >= 1 && shipUnlocked(me.race, k, s.tech) && !s.yard && n <= shipsAffordable(me.race, k, s.stock) && etat.session.status === 'playing';
}
