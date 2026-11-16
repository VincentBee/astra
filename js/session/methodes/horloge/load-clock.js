import { loadClock } from '../../horloge/load-clock.js';

/** Reprend l'heure commune gardée pour cette partie (sinon : le créateur l'a, les autres la reprendront). */
function loadClockMethode() {
  const c = loadClock(this.state.gid);
  if (c) Object.assign(this, { clockOff: c.off, clockSynced: !!c.synced });
  else this.clockSynced = this.isCreator(this.me);
}

export { loadClockMethode as loadClock };
