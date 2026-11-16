import { sunDistance } from './sun-distance.js';
import { FROST } from './frost.js';

/** Heure à laquelle le froid atteint la case `c` (la course a commencé à `start`). */
export function frostAt(sun, start, c) {
  const { d, far } = sunDistance(sun, c);
  return start + FROST.delayMs + FROST.durationMs * Math.pow(1 - d / far, 1 / FROST.ease);
}
