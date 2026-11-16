import { SOIL } from '../../game/index.js';
import { SHIP_KEYS } from '../../tech/index.js';
import { fuelAt } from '../caracteristiques/fuel-at.js';
import { freeze } from './freeze.js';

/**
 * Fusionne la flotte `a` dans `b` : tout passe dans `b`, qui se souvient
 * des flottes absorbées (`absorbed`), pour que les dégâts visant `a`
 * l'atteignent quand même. `b` garde son comportement. `a` est à retirer par l'appelant.
 */
export function merge(a, b, race, now) {
  const fuel = fuelAt(a, race, now) + fuelAt(b, race, now);
  freeze(b, race, now);
  const ships = {};
  for (const k of SHIP_KEYS) if ((a.ships[k] || 0) + (b.ships[k] || 0)) ships[k] = (a.ships[k] || 0) + (b.ships[k] || 0);
  Object.assign(b, {
    ships,
    cargo: Object.fromEntries(SOIL.map((r) => [r, (a.cargo?.[r] || 0) + (b.cargo?.[r] || 0)])),
    fuel,
    order: null,
    absorbed: [...new Set([...(b.absorbed || []), a.id, ...(a.absorbed || [])])].slice(-40),
  });
}
