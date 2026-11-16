/** Heure de la fin de la flotte `f` de `owner` : froid ou combat, la première (D-163). */
export function fleetDeadAt(owner, f, now) {
  return Math.min(this.fleetFrostAt(f), this.fleetKillAt(owner, f, now));
}
