import { settle } from '../../game.js';
import { freeze } from '../../fleet.js';

/** Retire `amt` d'une partie (vérifié avant). */
export function take(side, race, amt, now) {
  if (side.planet) {
    settle(side.planet, now);
    const s = side.planet.stock;
    s.minerals -= amt.minerals || 0;
    s.food -= amt.food || 0;
    s.energy -= amt.fuel || 0;
    return;
  }
  const f = side.fleet;
  freeze(f, race, now);
  f.cargo = { ...f.cargo, minerals: (f.cargo?.minerals || 0) - (amt.minerals || 0), food: (f.cargo?.food || 0) - (amt.food || 0) };
  f.fuel -= amt.fuel || 0;
}
