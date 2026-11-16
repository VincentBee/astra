import { empireScore } from '../../game.js';

/**
 * Points de l'empire d'une fiche, comme `Session.scoreOf` : la planète mère (si le joueur en a
 * encore une), puis ses colonies. Tout perdu : 0 point.
 */
export function ficheScore(fiche, world) {
  if (!fiche?.race) return 0;
  const planets = [];
  if (fiche.planet && fiche.home) planets.push(fiche.planet);
  for (const [id, pl] of Object.entries(fiche.colonies || {})) if (world.some((w) => w.id === id)) planets.push(pl);
  return empireScore(fiche.race, planets, fiche.fleets || []);
}
