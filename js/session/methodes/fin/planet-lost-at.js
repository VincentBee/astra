import { sameCell } from '../../../regles/game/index.js';

/**
 * Heure à laquelle le joueur `p` a perdu sa planète `pl` (un élément de planetsOf), vue par
 * tous : l'heure du gel, ou de la prise lue dans le rapport `capture` de l'attaquant (D-180,
 * D-416) : la mort d'un joueur hors ligne tombe à sa vraie heure, pas quand on s'en aperçoit.
 * `now` si elle est perdue sans rapport connu (cas rare, non confirmé).
 */
export function planetLostAt(p, pl, now) {
  const frost = this.frostOf(pl.cell);
  if (frost <= now) return frost;
  const since = pl.key === 'home' ? p.claimAt || p.rank || 0 : pl.planet.claimAt || 0;
  const players = Object.values(this.state?.players || {});
  const caps = players.flatMap((o) => (o.effects || []).filter((e) => e.capture && e.to === p.id && sameCell(e.cell, pl.cell) && e.at >= since && !this.goneBy(o, e.at)).map((e) => e.at));
  return caps.length ? Math.min(...caps) : now;
}
