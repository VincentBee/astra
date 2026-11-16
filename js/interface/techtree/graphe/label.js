import { TECHS, SHIPS } from '../../../tech.js';
import { RACES, POWERS } from '../../../game.js';
import { ROLES } from '../donnees/roles.js';
import { etat } from '../etat.js';
import { dur } from '../outils/dur.js';

/** Nom et sous-titre d'une bulle. */
export function label(n) {
  const R = RACES[etat.race];
  if (n.kind === 'tech') {
    const t = TECHS[etat.race][n.id];
    return [t.name, `${R.buildings.lab.short} ${t.req.lab} · max ${t.max}`];
  }
  if (n.kind === 'ship') return [SHIPS[etat.race][n.type].name, ROLES[n.type]];
  if (n.kind === 'power') return [POWERS[n.key].name, `Pouvoir · recharge ${dur(POWERS[n.key].cooldown)}`];
  const b = R.buildings[n.key];
  return [b.name, b.start ? `Bâtiment · niv. ${b.start} au départ` : 'Bâtiment'];
}
