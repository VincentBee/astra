import { sameCell } from '../../../regles/game/index.js';
import { isCell } from '../../fiches/is-cell.js';

export function shuttlePlanet(p, cell, at) {
  const pl = isCell(cell) && this.planetsOf(p).find((x) => sameCell(x.cell, cell));
  return pl && this.ownerAt(pl.cell)?.id === p.id && this.frostOf(pl.cell) > at ? pl : null;
}
