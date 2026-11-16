import { settle, SOIL } from '../../../regles/game/index.js';
import { launch, fleetCargo, fleetTank } from '../../../regles/fleet/index.js';

/**
 * Colonie perdue au profit d'un joueur arrivé avant moi : comme si ma
 * flotte de colonisation l'avait trouvée prise en arrivant, ses
 * vaisseaux (colonisateur compris), ce qui tient dans leurs soutes et
 * leurs réservoirs repartent en flotte, en orbite, même au-delà de
 * MAX_FLEETS (D-470). Renvoie cette flotte.
 */
export function evacuate(p, colony, w) {
  const now = this.now();
  p.fleets ||= [];
  // Pas de limite de flottes ici : c'est un retour forcé, pas un ordre ; sinon les vaisseaux disparaîtraient (#80, D-470).
  if (!colony) return null;
  settle(colony, now);
  // Le colonisateur qui l'a fondée repart avec la flotte ; une colonie prise au combat n'en a pas consommé (D-200).
  colony.ships = { ...(colony.ships || {}) };
  if (!colony.captured) colony.ships.colony = (colony.ships.colony || 0) + 1;
  let room = fleetCargo(p.race, colony.ships);
  const cargo = {};
  for (const r of SOIL) {
    cargo[r] = Math.min(room, Math.floor(colony.stock[r] || 0));
    room -= cargo[r];
  }
  const fuel = Math.min(fleetTank(p.race, colony.ships), Math.floor(colony.stock.energy || 0));
  const res = launch(colony, { ships: colony.ships, cargo, fuel, at: { x: w.x, y: w.y }, origin: 'home', id: this.newId(6) }, now);
  if (res.error) return null;
  p.fleets.push(res.fleet);
  return res.fleet;
}
