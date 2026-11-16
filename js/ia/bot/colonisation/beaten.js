import { moving } from '../../../fleet.js';
import { ahead } from './ahead.js';
import { rivalColonizers } from './rival-colonizers.js';

/** Mon colonisateur en route sera-t-il devancé sur sa planète par un colonisateur adverse ? */
export function beaten(ctx, f) {
  if (f.order?.kind !== 'colonize' || !moving(f, ctx.now) || ctx.s.locked(f.id)) return false;
  return ahead(rivalColonizers(ctx).get(f.order.world), f.arrive, ctx.p.id);
}
