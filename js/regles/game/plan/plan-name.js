import { TECHS, SHIPS } from '../../tech/index.js';
import { RACES } from '../races/races.js';

/** « Mine niv 8 », « Armes niv 2 », « 5 × Chasseur » : un élément du fil, pour un message. */
export function planName(race, item, out) {
  if (typeof item === 'string') return `${RACES[race].buildings[item].short || RACES[race].buildings[item].name} niv ${out.level}`;
  if (item.tech) return `${TECHS[race][item.tech].name} niv ${out.level}`;
  return `${out.count} × ${SHIPS[race][item.ship].name}`;
}
