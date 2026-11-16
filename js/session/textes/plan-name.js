import { RACES } from '../../game.js';
import { TECHS, SHIPS } from '../../tech.js';

/** Nom d'un élément du fil, pour le journal : « Mine », « la recherche Armes », « 5 × Chasseur ». */
export function planName(race, item) {
  if (typeof item === 'string') return RACES[race].buildings[item].name;
  if (item.tech) return `la recherche ${TECHS[race][item.tech].name}`;
  return `${item.n} × ${SHIPS[race][item.ship].name}`;
}
