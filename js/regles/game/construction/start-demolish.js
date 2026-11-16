import { own } from '../outils/own.js';
import { raceOf } from '../races/race-of.js';
import { settle } from '../economie/settle.js';
import { upgradeCost } from './upgrade-cost.js';
import { buildDuration } from './build-duration.js';

/**
 * Déconstruit un niveau du bâtiment `key` : occupe le chantier pendant la
 * moitié du temps de construction de ce niveau, rend tout de suite la
 * moitié de son coût, et libère sa place à la fin. Renvoie une erreur
 * lisible ou null.
 */
export function startDemolish(planet, key, now) {
  const R = raceOf(planet);
  if (!R) return 'Choisis d’abord ta race.';
  if (!own(R.buildings, key)) return 'Bâtiment inconnu.';
  settle(planet, now);
  now = planet.at;
  if (planet.queue) return 'Un chantier est déjà en cours.';
  const level = planet.levels[key] || 0;
  if (level < 1) return 'Rien à déconstruire.';
  const cost = upgradeCost(planet.race, key, level - 1);
  for (const [r, v] of Object.entries(cost)) planet.stock[r] = (planet.stock[r] || 0) + Math.floor(v / 2);
  planet.queue = { key, level: level - 1, start: now, end: now + Math.round(buildDuration(planet.race, planet.levels, cost) / 2), demolish: true };
  return null;
}
