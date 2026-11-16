import { fleetSpeed, slowestShip } from '../../../regles/fleet/index.js';
import { TEMPO } from '../../../regles/game/index.js';
import { SHIP_KEYS, SHIPS } from '../../../regles/tech/index.js';

/** « vitesse 7,0 cases/min, celle du Cargo » : la flotte va au pas de son vaisseau le plus lent. */
export function speedText(race, ships, tech) {
  const slow = slowestShip(race, ships, tech);
  if (!slow) return '';
  const v = (fleetSpeed(race, ships, tech) * TEMPO).toFixed(1).replace('.', ',');
  const kinds = SHIP_KEYS.filter((k) => ships[k] > 0).length;
  return `vitesse ${v} cases/min${kinds > 1 ? `, celle du plus lent : ${SHIPS[race][slow].name}` : ''}`;
}
