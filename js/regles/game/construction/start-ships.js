import { SHIPS, shipUnlocked, shipDuration } from '../../tech/index.js';
import { lv } from '../outils/lv.js';
import { own } from '../outils/own.js';
import { settle } from '../economie/settle.js';
import { covers } from './covers.js';
import { pay } from './pay.js';

/** Lance un lot de vaisseaux au chantier naval de cette planète. */
export function startShips(planet, type, count, now) {
  const S = own(SHIPS[planet.race], type);
  if (!S) return 'Vaisseau inconnu.';
  count = Math.floor(count);
  if (!(count >= 1 && count <= 50)) return 'Entre 1 et 50 vaisseaux par lot.';
  settle(planet, now);
  now = planet.at; // heure qui recule : l'ordre part de l'heure déjà comptée, pas d'avant
  const yard = lv(planet.levels, 'yard');
  if (!yard) return 'Construis d’abord un chantier naval.';
  if (planet.yard) return 'Le chantier naval est déjà occupé.';
  if (!shipUnlocked(planet.race, type, planet.tech)) return 'Ce vaisseau n’est pas encore recherché.';
  const cost = Object.fromEntries(Object.entries(S.cost).map(([r, v]) => [r, v * count]));
  if (!covers(planet.stock, cost)) return 'Ressources insuffisantes.';
  pay(planet, cost);
  planet.yard = { type, count, start: now, end: now + shipDuration(planet.race, type, count, yard) };
  return null;
}
