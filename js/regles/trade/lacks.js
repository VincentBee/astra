import { TRADE_RES } from './trade-res.js';
import { TRADE_NAMES } from './trade-names.js';
import { holdings } from './holdings.js';
import { settle } from '../../game.js';

/** La partie a-t-elle de quoi donner `amt` ? Erreur ou null. */
export function lacks(side, race, amt, now) {
  if (side.planet) settle(side.planet, now);
  const h = holdings(side, race, now);
  const miss = TRADE_RES.filter((r) => (amt[r] || 0) > h[r]);
  return miss.length ? `Pas assez de ${miss.map((r) => TRADE_NAMES[r].toLowerCase()).join(', ')}.` : null;
}
