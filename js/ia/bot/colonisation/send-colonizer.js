import { distance } from '../../../regles/game/index.js';
import { fleetBurn, fuelAt, fleetPos } from '../../../regles/fleet/index.js';
import { colonyTargets } from './colony-targets.js';

/**
 * Envoie une flotte qui porte un colonisateur vers la meilleure planète libre, depuis là où
 * elle est (en route : elle change de cap).
 */
export function sendColonizer(ctx, f, home = false) {
  const at = fleetPos(f, ctx.now);
  const pos = { x: Math.round(at.x), y: Math.round(at.y) };
  for (const w of colonyTargets(ctx, pos, home, f.ships).slice(0, 3)) {
    if (fleetBurn(ctx.p.race, f.ships) * distance(at, w) > fuelAt(f, ctx.p.race, ctx.now) + 1e-9) continue;
    return ctx.order(() => ctx.s.moveFleet(f.id, { x: w.x, y: w.y }, 'colonize'));
  }
  return false;
}
