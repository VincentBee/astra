import { RACES } from '../../regles/game/index.js';
import { TECHS, SHIPS } from '../../regles/tech/index.js';

/** Journal : ce que le fil vient de lancer tout seul (événement `start` de stateAt). */
export function planStartText(p, d, where) {
  if (d.lane === 'research') return `${p.name} lance la recherche ${TECHS[p.race][d.key].name} niv. ${d.level} sur ${where} (fil).`;
  if (d.lane === 'yard') return `${p.name} met en chantier ${d.count} × ${SHIPS[p.race][d.type].name} sur ${where} (fil).`;
  return `${p.name} lance ${RACES[p.race].buildings[d.key].name} niv. ${d.level} sur ${where} (fil).`;
}
