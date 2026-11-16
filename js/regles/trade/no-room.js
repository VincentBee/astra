import { fuelAt, fleetCargo, fleetTank } from '../../fleet.js';

/**
 * La partie a-t-elle la place de recevoir `amt`, une fois parti ce qu'elle
 * donne (`out`) ? Une planète a toujours la place. Erreur ou null.
 */
export function noRoom(side, race, amt, now, out = {}) {
  if (!side.fleet) return null;
  const f = side.fleet;
  const load = (f.cargo?.minerals || 0) + (f.cargo?.food || 0) - (out.minerals || 0) - (out.food || 0) + (amt.minerals || 0) + (amt.food || 0);
  if (load > fleetCargo(race, f.ships)) return 'Les soutes sont trop petites.';
  if (fuelAt(f, race, now) - (out.fuel || 0) + (amt.fuel || 0) > fleetTank(race, f.ships) + 1e-6) return 'Les réservoirs sont trop petits.';
  return null;
}
