import { moving } from '../deplacement/moving.js';
import { parkedCell } from './parked-cell.js';

/** Deux flottes arrêtées sur la même case. */
export function together(a, b, now) {
  if (moving(a, now) || moving(b, now)) return false;
  const ca = parkedCell(a);
  const cb = parkedCell(b);
  return ca.x === cb.x && ca.y === cb.y;
}
