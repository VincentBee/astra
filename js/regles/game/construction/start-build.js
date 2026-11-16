import { own } from '../outils/own.js';
import { raceOf } from '../races/race-of.js';
import { settle } from '../economie/settle.js';
import { upgradeCost } from './upgrade-cost.js';
import { buildDuration } from './build-duration.js';
import { covers } from './covers.js';
import { pay } from './pay.js';
import { placesLeft } from '../planete/places-left.js';

/** Valide et applique un ordre de construction. Renvoie une erreur lisible ou null. */
export function startBuild(planet, key, now) {
  const R = raceOf(planet);
  if (!R) return 'Choisis d’abord ta race.';
  if (!own(R.buildings, key)) return 'Bâtiment inconnu.';
  settle(planet, now);
  now = planet.at; // heure qui recule : l'ordre part de l'heure déjà comptée, pas d'avant
  if (planet.queue) return 'Un chantier est déjà en cours.';
  if (placesLeft(planet) <= 0) return `Plus de place : les ${planet.places} places de cette planète sont prises.`;
  const level = planet.levels[key] || 0;
  const cost = upgradeCost(planet.race, key, level);
  if (!covers(planet.stock, cost)) return 'Ressources insuffisantes.';
  pay(planet, cost);
  planet.queue = { key, level: level + 1, start: now, end: now + buildDuration(planet.race, planet.levels, cost) };
  return null;
}
