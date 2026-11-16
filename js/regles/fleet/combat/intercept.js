import { fleetSpeed } from '../caracteristiques/fleet-speed.js';
import { tripMs } from '../deplacement/trip-ms.js';
import { fleetPos } from '../deplacement/fleet-pos.js';

/**
 * Point d'interception de `target` par la flotte `f` partant de sa position
 * à `now` : le premier instant où `f` peut être là où sera la cible. Si la
 * cible va trop vite, son point d'arrivée (elle s'y arrête).
 */
export function intercept(f, race, tech, target, now) {
  const speed = fleetSpeed(race, f.ships, tech);
  const from = fleetPos(f, now);
  const end = Math.max(now, target.arrive);
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const t = now + ((end - now) * i) / steps;
    const p = fleetPos(target, t);
    if (now + tripMs(from, p, speed) <= t + 1) return p;
  }
  return fleetPos(target, end);
}
