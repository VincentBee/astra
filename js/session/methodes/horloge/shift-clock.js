/** Décale l'heure commune de `ms` ; les mesures des autres sur moi et les miennes repartent de zéro. */
export function shiftClock(ms) {
  this.clockOff += ms;
  this.clockEpoch++;
  this.clockRef = {};
  this.clockVotes = {};
  for (const l of this.links.values()) Object.assign(l, { skews: [], skew: undefined, driftSent: false });
  this.storeClock();
}
