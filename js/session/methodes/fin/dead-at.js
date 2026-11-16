/** Heure à laquelle un joueur a tout perdu, ou null s'il est encore en vie. Calculable par tous, même s'il est hors ligne. */
export function deadAt(p, now = this.now()) {
  if (!p?.race) return null;
  if (Number.isFinite(p.out)) return p.out;
  if (!Number.isFinite(p.since)) return this.inRace(p) ? this.colonizerDeadAt(p, now) : null;
  const all = this.planetsOf(p);
  if (!all.length) return this.colonizerDeadAt(p, now);
  if (this.livePlanets(p, now).length) return null;
  const t = Math.max(...all.map((pl) => this.planetLostAt(p, pl, now)));
  return t <= now ? t : null; // demandé pour une heure d'avant la prise : encore en vie
}
