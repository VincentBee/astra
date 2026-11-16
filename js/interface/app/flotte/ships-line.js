import { SHIP_KEYS, SHIPS } from '../../../tech.js';
import { esc } from '../outils/esc.js';
import { costText } from '../planete/cost-text.js';

/** « 3 × Frégate, 1 × Cargo · 200 ◆ », en HTML. */
export function shipsLine(race, f) {
  const ships = SHIP_KEYS.filter((k) => f.ships[k]).map((k) => `${f.ships[k]} × ${esc(SHIPS[race][k].name)}`).join(', ');
  const cargo = f.cargo && f.cargo.minerals + f.cargo.food ? ` · ${costText(f.cargo)}` : '';
  return `${ships}${cargo}`;
}
