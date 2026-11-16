import { UNIVERSE } from './universe.js';
import { distance } from './distance.js';
import { sameCell } from './same-cell.js';

/**
 * Case de départ libre, à au moins `minGap` pas des planètes existantes, et
 * acceptée par `ok`. `random` est injectable pour les tests.
 */
export function freeCell(taken, random = Math.random, minGap = 4, ok = () => true) {
  for (let gap = minGap; gap >= 0; gap--) {
    for (let tries = 0; tries < 200; tries++) {
      const c = { x: 1 + Math.floor(random() * (UNIVERSE.w - 2)), y: 1 + Math.floor(random() * (UNIVERSE.h - 2)) };
      if (ok(c) && taken.every((t) => distance(t, c) >= Math.max(gap, 1))) return c;
    }
  }
  const center = { x: Math.floor(UNIVERSE.w / 2), y: Math.floor(UNIVERSE.h / 2) };
  if (ok(center)) return center;
  // Dernier recours : la première case libre en partant du coin.
  for (let y = 0; y < UNIVERSE.h; y++) {
    for (let x = 0; x < UNIVERSE.w; x++) {
      const c = { x, y };
      if (ok(c) && !taken.some((t) => sameCell(t, c))) return c;
    }
  }
  return center;
}
