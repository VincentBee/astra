import { empireScore } from '../../../regles/game/index.js';

/**
 * Points du joueur `p`, tombé à l'heure `dead`, juste avant sa chute (D-416). Sa fiche le dit
 * (`deathPts`) quand son téléphone a vu sa chute. Sinon (hors ligne, sa fiche a encore tout),
 * on les calcule comme lui le fera : les planètes perdues à cette heure-là (la dernière vague),
 * pas celles perdues avant, et ses flottes encore en vie à cette heure. Ainsi le classement
 * ne change pas quand il revient.
 */
export function pointsAtDeath(p, dead) {
  if (p.deathPts !== undefined) return p.deathPts;
  const all = this.planetsOf(p);
  if (Number.isFinite(p.out) || !all.length) return this.scoreOf(p);
  const wave = all.filter((pl) => this.planetLostAt(p, pl, dead) >= dead);
  const fleets = (p.fleets || []).filter((f) => this.fleetDeadAt(p, f, dead) > dead);
  return empireScore(p.race, wave.map((x) => x.planet), fleets);
}
