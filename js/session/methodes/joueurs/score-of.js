import { empireScore } from '../../../regles/game/index.js';

/** Points de l'empire d'un joueur (toutes ses planètes, ses recherches, ses vaisseaux). */
export function scoreOf(p) {
  if (!p?.race) return 0;
  return empireScore(p.race, this.planetsOf(p).map((x) => x.planet), p.fleets || []);
}
