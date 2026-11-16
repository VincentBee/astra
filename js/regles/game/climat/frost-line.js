import { sunDistance } from './sun-distance.js';
import { FROST } from './frost.js';

/** Distance au soleil où passe le froid à `now` (Infinity avant son départ). */
export function frostLine(sun, start, now) {
  const { far } = sunDistance(sun, sun);
  const k = (now - start - FROST.delayMs) / FROST.durationMs;
  return k < 0 || !Number.isFinite(k) ? Infinity : Math.max(0, far * (1 - Math.pow(Math.min(1, k), FROST.ease)));
}
