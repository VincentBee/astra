/**
 * Classement : [{ id, pts, dead, best }], les vivants d'abord, puis les derniers tombés, puis
 * les points. `pts` : ce que le joueur a maintenant (0 s'il a tout perdu). `best` départage :
 * pour un joueur tombé, ses points juste avant sa chute (pointsAtDeath, D-416), les mêmes
 * avant et après qu'il a vu sa chute.
 */
export function ranking(now = this.now()) {
  return Object.values(this.state?.players || {})
    .filter((p) => p.race && (p.planet || this.inRace(p)))
    .map((p) => {
      const pts = this.scoreOf(p);
      const dead = this.deadAt(p, now);
      return { id: p.id, pts, dead, best: dead != null ? this.pointsAtDeath(p, dead) : pts };
    })
    .sort((a, b) => (a.dead ?? Infinity) !== (b.dead ?? Infinity) ? (b.dead ?? Infinity) - (a.dead ?? Infinity) : b.best - a.best || (a.id < b.id ? -1 : 1));
}
