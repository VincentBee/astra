import { moving } from '../../../regles/fleet/index.js';
import { beaten } from '../colonisation/beaten.js';
import { sendColonizer } from '../colonisation/send-colonizer.js';
import { dockNearest } from './dock-nearest.js';

// ----- flottes et combat ------------------------------------------------------------

/** Flotte arrêtée sans ordre : un colonisateur repart chercher une place, les autres rentrent se poser. */
export function steerFleet(ctx, f) {
  const { s, p, now } = ctx;
  if (f.ships.colony && beaten(ctx, f)) {
    sendColonizer(ctx, f);
    return;
  }
  if (f.order || moving(f, now) || s.locked(f.id)) return;
  if (f.ships.colony) {
    if (!sendColonizer(ctx, f)) dockNearest(ctx, f);
    return;
  }
  dockNearest(ctx, f);
}
