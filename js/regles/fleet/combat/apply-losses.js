import { SOIL } from '../../game/index.js';
import { SHIP_KEYS } from '../../tech/index.js';
import { countShips } from '../caracteristiques/count-ships.js';
import { fleetCargo } from '../caracteristiques/fleet-cargo.js';
import { fleetTank } from '../caracteristiques/fleet-tank.js';
import { fuelAt } from '../caracteristiques/fuel-at.js';
import { fleetPos } from '../deplacement/fleet-pos.js';
import { moving } from '../deplacement/moving.js';
import { moveTo } from '../deplacement/move-to.js';

/**
 * Pertes subies par une flotte (combat), en route ou à l'arrêt :
 * `lost` vaisseaux, `take` cargaison. Une flotte en route reprend son trajet
 * depuis là où elle est, avec ce qui lui reste. Renvoie false si elle est
 * détruite.
 */
export function applyLosses(f, race, tech, lost, take, now) {
  const ships = {};
  for (const k of SHIP_KEYS) {
    const n = (f.ships[k] || 0) - (lost?.[k] || 0);
    if (n > 0) ships[k] = n;
  }
  if (!countShips(ships)) return false;
  const pos = fleetPos(f, now);
  const fuel = Math.min(fuelAt(f, race, now), fleetTank(race, ships));
  const to = f.to;
  const order = f.order;
  const go = moving(f, now);
  // Segment immobile ici, avec les vaisseaux restants…
  Object.assign(f, { ships, from: pos, to: { ...pos }, depart: now, arrive: now, fuel });
  // … et la cargaison qui tient encore dans les soutes.
  let room = fleetCargo(race, ships);
  const cargo = {};
  for (const r of SOIL) {
    cargo[r] = Math.max(0, Math.min(room, (f.cargo?.[r] || 0) - (take?.[r] || 0)));
    room -= cargo[r];
  }
  f.cargo = cargo;
  if (go) moveTo(f, race, tech, to, order, now); // … puis la suite du trajet
  else Object.assign(f, { to: { ...to }, from: { ...to } });
  return true;
}
