import { readTap, underFinger } from '../../../aim/index.js';
import { etat } from '../../etat.js';
import { cellCss } from '../zoom/cell-css.js';
import { mapItems } from './map-items.js';
import { orderAt } from './order-at.js';

/** On lâche la flotte traînée : même règle qu'un toucher, sans choisir une autre de mes flottes. */
export function dropFleet(fid, at) {
  if (!etat.session?.state || !etat.session.myFleet(fid)) return;
  const px = cellCss(at);
  const items = mapItems();
  const t = readTap(items, at, px, fid, true);
  // Lâchée sur elle-même (plus près d'elle que de toute cible) : rien, elle reste sélectionnée.
  const self = items.find((it) => it.type === 'mine' && it.id === fid);
  const dSelf = self ? Math.hypot(self.x - at.x, self.y - at.y) : Infinity;
  const dTarget = t.kind === 'one' ? Math.hypot(t.it.x - at.x, t.it.y - at.y) : t.kind === 'many' ? Math.hypot(t.list[0].x - at.x, t.list[0].y - at.y) : Infinity;
  if (underFinger(self ? [self] : [], at, px).length && dSelf <= dTarget) return;
  orderAt(fid, t, at);
}
