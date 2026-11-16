import { aggressive, fuelAt, moving, ORDERS } from '../../../fleet.js';
import { sameCell } from '../../../game.js';
import { de } from '../carte/de.js';
import { mapPlanets } from '../carte/map-planets.js';
import { etat } from '../etat.js';
import { DRY } from '../outils/dry.js';
import { cellName } from './cell-name.js';

/** Ce que fait une flotte : « Attaque → Kepler », « En orbite de Kepler », « Stationne en [4:7] ». */
export function fleetStatus(race, f, now) {
  const where = cellName(f.to);
  if (moving(f, now) && f.stranded) return `Tombera en panne vers ${where}`;
  if (!moving(f, now) && fuelAt(f, race, now) < DRY) return `À sec vers ${where}`;
  const offer = (etat.session.state.players[etat.session.me]?.offers || []).find((o) => o.from.fleet === f.id);
  if (offer) return `Attend la réponse de ${etat.session.state.players[offer.to.pid]?.name || '?'} (échange)`;
  if (f.order?.kind === 'chase') {
    const foe = etat.session.state.players[f.order.pid];
    return `Poursuite d’une flotte ${foe ? de(foe.name) : 'ennemie'}`;
  }
  const hawk = aggressive(f) ? ' · agressive' : '';
  if (moving(f, now)) return `${f.order ? ORDERS[f.order.kind]?.name || 'Ordre' : 'Déplacement'} → ${where}${hawk}`;
  return `${mapPlanets().some((w) => sameCell(w, f.to)) ? `En orbite ${de(where)}` : `Stationne en ${where}`}${hawk}`;
}
