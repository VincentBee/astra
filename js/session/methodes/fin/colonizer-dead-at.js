/**
 * Heure à laquelle un joueur de la course qui n'a pas de planète perd son dernier colonisateur,
 * au froid ou au combat (D-163), calculable par tous ; null s'il lui en reste un à `now`. Prêt
 * mais pas encore entré (hors ligne depuis le départ) : sa flotte de départ compte (ghostFleet).
 */
export function colonizerDeadAt(p, now) {
  if (p.home) return null;
  const fleets = this.fleetsOf(p).filter((f) => f.ships?.colony > 0);
  if (!fleets.length) return null;
  const t = Math.max(...fleets.map((f) => this.fleetDeadAt(p, f, now)));
  return t <= now ? t : null;
}
