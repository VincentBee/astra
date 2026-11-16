import { distance } from '../../../game.js';
import { tripMs } from '../../../fleet.js';

/**
 * Des vaisseaux partis de `base` peuvent rejoindre la flotte de conquête `g` : assez de
 * carburant, et ils arrivent après elle. Arrivés avant, la fusion effacerait son ordre de
 * conquête (merge) : la planète ne serait plus attaquée.
 */
export function canJoin(ctx, base, g, { speed, tank, burn, energy }) {
  if (ctx.s.locked(g.id)) return false;
  const d = distance(base.cell, g.to);
  return burn * d <= Math.min(tank, Math.floor(energy || 0)) && ctx.now + tripMs(base.cell, g.to, speed) >= g.arrive;
}
