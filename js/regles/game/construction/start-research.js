import { TECHS, techMissing, techCost, researchDuration } from '../../tech/index.js';
import { lv } from '../outils/lv.js';
import { own } from '../outils/own.js';
import { settle } from '../economie/settle.js';
import { covers } from './covers.js';
import { pay } from './pay.js';

/** Lance une recherche sur cette planète, avec son labo. Renvoie une erreur lisible ou null. */
export function startResearch(planet, key, now) {
  const T = own(TECHS[planet.race], key);
  if (!T) return 'Technologie inconnue.';
  settle(planet, now);
  now = planet.at; // heure qui recule : l'ordre part de l'heure déjà comptée, pas d'avant
  const lab = lv(planet.levels, 'lab');
  if (!lab) return 'Construis d’abord un labo.';
  if (planet.research) return 'Une recherche est déjà en cours.';
  const level = planet.tech?.[key] || 0;
  if (level >= T.max) return 'Niveau maximum atteint.';
  const miss = techMissing(planet.race, key, planet.tech, lab);
  if (miss) return `Il faut d’abord : ${miss}.`;
  const cost = techCost(planet.race, key, level);
  if (!covers(planet.stock, cost)) return 'Ressources insuffisantes.';
  pay(planet, cost);
  planet.research = { key, level: level + 1, start: now, end: now + researchDuration(cost, lab) };
  return null;
}
