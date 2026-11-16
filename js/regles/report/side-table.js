import { shipName } from './ship-name.js';
import { statsOf } from './stats-of.js';
import { totalLost } from './total-lost.js';
import { SHIP_KEYS } from '../tech/index.js';

/**
 * Tableau des forces d'un camp : une ligne par type (nombre, attaque et coque
 * unitaires, pertes), défense comprise, et ses totaux au départ.
 */
export function sideTable(rep, who) {
  const s = rep[who];
  const lost = totalLost(rep, who);
  const rows = SHIP_KEYS.filter((k) => s.ships[k] > 0).map((k) => {
    const st = statsOf(s, k);
    return { key: k, name: shipName(s.race, k), count: s.ships[k], attack: st.attack, hull: st.hull, lost: lost[k] || 0 };
  });
  if (s.fort?.hull > 0) rows.push({ key: 'fort', name: 'Défense de la planète', count: 1, attack: s.fort.attack, hull: s.fort.hull, lost: lost.fort || 0 });
  return { rows, fire: s.fire, hull: s.hull, hullLeft: s.hullLeft, bonus: s.bonus };
}
