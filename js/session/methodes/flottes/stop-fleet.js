import { stopAt } from '../../../regles/fleet/index.js';
import { techOf } from '../../outils/tech-of.js';

/** Arrête une de mes flottes sur la case la plus proche. */
export function stopFleet(id) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const f = this.myFleet(id);
  if (!f || this.locked(id)) return false;
  const was = this.shuttlesOf([f]);
  const err = stopAt(f, p.race, techOf(p), this.now());
  if (err) return this.refuse(err);
  this.touch(this.quitShuttles(p, was, null, 'flotte arrêtée'));
  this.changed();
  return true;
}
