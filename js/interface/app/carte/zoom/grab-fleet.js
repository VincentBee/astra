import { contenders, underFinger } from '../../../aim/index.js';
import { etat } from '../../etat.js';
import { mapItems } from '../selection/map-items.js';
import { cellCss } from './cell-css.js';

/** Ma flotte sous le doigt au moment d'appuyer (celle qu'on va traîner), ou null. */
export function grabFleet(at) {
  if (!etat.session?.state || etat.session.status !== 'playing') return null;
  const px = cellCss(at);
  const top = contenders(underFinger(mapItems(), at, px), px).map((h) => h.it);
  const mine = top.filter((it) => it.type === 'mine');
  return (mine.find((it) => it.id === etat.selFleet) || mine[0])?.id || null;
}
