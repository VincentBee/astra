import { TECHS, SHIPS } from '../../../tech.js';
import { own } from '../outils/own.js';
import { RACES } from '../races/races.js';

/** Élément du fil bien formé pour cette race, recopié proprement, ou null. */
export function planItem(race, item) {
  if (!RACES[race]) return null;
  if (typeof item === 'string') return own(RACES[race].buildings, item) ? item : null;
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  if (typeof item.tech === 'string') return own(TECHS[race], item.tech) ? { tech: item.tech } : null;
  if (typeof item.ship === 'string' && own(SHIPS[race], item.ship) && Number.isInteger(item.n) && item.n >= 1 && item.n <= 50) return { ship: item.ship, n: item.n };
  return null;
}
