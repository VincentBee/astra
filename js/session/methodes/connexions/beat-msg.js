/** Battement de cœur : mon heure commune, si je l'ai, et mon nombre de corrections (D-165). */
export function beatMsg(type, t0, extra) {
  return { type, t0, ...extra, w: this.clock(), sy: this.clockSynced, ep: this.clockEpoch };
}
