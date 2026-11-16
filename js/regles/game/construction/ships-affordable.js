import { SHIPS } from '../../tech/index.js';
import { own } from '../outils/own.js';

/** Plus grand lot de vaisseaux `type` que le stock `stock` peut payer (0 à 50, la taille maximale d'un lot). */
export function shipsAffordable(race, type, stock) {
  const S = own(SHIPS[race], type);
  if (!S) return 0;
  let n = 50;
  for (const [r, v] of Object.entries(S.cost)) if (v > 0) n = Math.min(n, Math.floor((stock[r] || 0) / v));
  return Math.max(0, n);
}
