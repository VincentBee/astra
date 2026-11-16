import { SOIL } from '../../game/index.js';
import { SHIPS, SHIP_KEYS } from '../../tech/index.js';
import { countShips } from '../caracteristiques/count-ships.js';
import { fleetCargo } from '../caracteristiques/fleet-cargo.js';
import { fleetTank } from '../caracteristiques/fleet-tank.js';
import { fuelAt } from '../caracteristiques/fuel-at.js';
import { freeze } from './freeze.js';

/**
 * Fait passer une partie de la flotte `a` dans la flotte `b` :
 * part = { ships, cargo, fuel }. `b` peut être une flotte neuve, vide (pour
 * scinder). Chacune doit garder au moins un vaisseau, et ses soutes et
 * réservoirs doivent suffire. Modifie les deux ; renvoie une erreur ou null.
 */
export function transfer(a, b, race, part, now) {
  const fuelA = fuelAt(a, race, now);
  const fuelB = b.ships && countShips(b.ships) ? fuelAt(b, race, now) : b.fuel || 0;
  const ships = {};
  for (const k of SHIP_KEYS) {
    const n = Math.floor(Number(part.ships?.[k]) || 0);
    if (n < 0 || n > (a.ships[k] || 0)) return `Pas assez de ${SHIPS[race][k].name}.`;
    if (n) ships[k] = n;
  }
  const cargo = {};
  for (const r of SOIL) {
    const v = Math.floor(Number(part.cargo?.[r]) || 0);
    if (v < 0 || v > (a.cargo?.[r] || 0)) return 'Pas autant dans les soutes.';
    cargo[r] = v;
  }
  const fuel = Math.max(0, Number(part.fuel) || 0);
  if (fuel > fuelA + 1e-6) return 'Pas autant de carburant.';
  const give = Math.min(fuel, fuelA);

  const aShips = Object.fromEntries(SHIP_KEYS.map((k) => [k, (a.ships[k] || 0) - (ships[k] || 0)]).filter(([, n]) => n > 0));
  const bShips = Object.fromEntries(SHIP_KEYS.map((k) => [k, (b.ships?.[k] || 0) + (ships[k] || 0)]).filter(([, n]) => n > 0));
  if (!countShips(aShips)) return 'Il doit rester au moins un vaisseau (sinon, fusionne les flottes).';
  if (!countShips(bShips)) return 'Choisis au moins un vaisseau.';
  const aCargo = Object.fromEntries(SOIL.map((r) => [r, (a.cargo?.[r] || 0) - cargo[r]]));
  const bCargo = Object.fromEntries(SOIL.map((r) => [r, (b.cargo?.[r] || 0) + cargo[r]]));
  const load = (c) => SOIL.reduce((t, r) => t + c[r], 0);
  if (load(aCargo) > fleetCargo(race, aShips)) return 'Les soutes de la flotte qui donne seraient trop petites : déplace aussi de la cargaison.';
  if (load(bCargo) > fleetCargo(race, bShips)) return 'Les soutes de la flotte qui reçoit sont trop petites.';
  if (fuelA - give > fleetTank(race, aShips) + 1e-6) return 'Les réservoirs de la flotte qui donne seraient trop petits : déplace aussi du carburant.';
  if (fuelB + give > fleetTank(race, bShips) + 1e-6) return 'Les réservoirs de la flotte qui reçoit sont trop petits.';

  freeze(a, race, now);
  if (b.ships && countShips(b.ships)) freeze(b, race, now);
  Object.assign(a, { ships: aShips, cargo: aCargo, fuel: fuelA - give, order: null });
  Object.assign(b, { ships: bShips, cargo: bCargo, fuel: fuelB + give, order: null });
  return null;
}
