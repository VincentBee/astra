import { storeClock } from '../../horloge/store-clock.js';

/** Garde l'heure commune : l'écart avec l'heure du téléphone maintenant (juste même si elle a sauté page ouverte). */
function storeClockMethode() {
  if (this.state?.gid && !this.isBot) storeClock(this.state.gid, { off: this.clock() - this.wall(), synced: this.clockSynced, at: this.wall() });
}

export { storeClockMethode as storeClock };
