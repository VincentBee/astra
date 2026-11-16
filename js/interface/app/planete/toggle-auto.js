import { etat } from '../etat.js';
import { stateAt } from '../../../regles/game/index.js';

/** ×∞ touché (D-534) : la règle passe à ce vaisseau (même taille de lot) ; sur le vaisseau déjà réglé, elle s'arrête. */
export function toggleAuto(key, k) {
  const me = etat.session?.state?.players[etat.session.me];
  const pl = me && etat.session.planetOf(me, key);
  if (!pl) return;
  const rule = stateAt(pl.planet, etat.session.now()).auto;
  if (rule?.ship === k) etat.session.setAutoShips(null, 0, key);
  else etat.session.setAutoShips(k, rule?.n || 1, key);
}
