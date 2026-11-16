import { moving } from '../../../fleet.js';

/**
 * Colonisateurs adverses en route, par planète visée : le premier arrivé de chaque planète
 * ({ arrive, pid }). L'IA voit toutes les flottes de la partie (D-152), comme leur ordre.
 */
export function rivalColonizers(ctx) {
  const { s, p, now } = ctx;
  const out = new Map();
  for (const o of Object.values(s.state.players)) {
    if (o.id === p.id) continue;
    for (const f of o.fleets || []) {
      if (f.order?.kind !== 'colonize' || !moving(f, now)) continue;
      const r = out.get(f.order.world);
      if (!r || f.arrive < r.arrive || (f.arrive === r.arrive && o.id < r.pid)) out.set(f.order.world, { arrive: f.arrive, pid: o.id });
    }
  }
  return out;
}
