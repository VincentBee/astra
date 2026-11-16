import { RACES } from '../races/races.js';
import { own } from '../outils/own.js';
import { SHIPS } from '../../tech/index.js';

/**
 * Achat automatique de vaisseaux (D-530) : une règle par planète, `planet.auto = { ship, n }`.
 * Chantier naval libre, plus aucun lot de vaisseaux au fil, et stock suffisant : un lot de
 * `n` vaisseaux `ship` part tout seul, encore et encore. Elle se calcule dans stateAt comme le
 * fil (même résultat téléphone éteint, au rattrapage et au rejeu) : c'est un dernier élément du
 * fil qui ne s'en va jamais. Renvoie la règle recopiée proprement, ou null.
 */
export function autoRule(race, rule) {
  if (!RACES[race] || !rule || typeof rule !== 'object' || Array.isArray(rule)) return null;
  if (typeof rule.ship !== 'string' || !own(SHIPS[race], rule.ship)) return null;
  return Number.isInteger(rule.n) && rule.n >= 1 && rule.n <= 50 ? { ship: rule.ship, n: rule.n } : null;
}
